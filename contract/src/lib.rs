//! # CoinFlip — P2P coin flip game on Soroban
//!
//! Business rules:
//! - A player creates a room, picks a side (heads/tails) and locks an entry fee (XLM).
//!   The room stays open (no countdown) until an opponent arrives.
//! - When an opponent joins by matching the fee, the countdown starts:
//!   a **10 second** entry window, then **5 seconds** until the coin flip.
//! - After the countdown (15s total from the join), anyone can trigger the flip.
//! - The winner receives the whole pot (2x entry fee).
//! - While a room is still open (no opponent), the creator can cancel anytime
//!   and get refunded.
#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, Vec,
};

/// Entry-window countdown that starts when an opponent joins.
pub const ENTRY_WINDOW_SECS: u64 = 10;
/// Extra delay after the entry window before the flip can be resolved.
pub const RESOLVE_DELAY_SECS: u64 = 5;

/// TTL management for persistent room entries (~30 days of ledgers).
const ROOM_TTL_THRESHOLD: u32 = 259_200;
const ROOM_TTL_EXTEND: u32 = 518_400;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Room with the given id does not exist.
    RoomNotFound = 1,
    /// Room is not open for joining.
    RoomNotOpen = 2,
    /// The 10s + 5s countdown has not finished yet.
    CountdownNotFinished = 3,
    /// Room already has a final outcome.
    AlreadyFinalized = 4,
    /// Creator cannot join their own room.
    CannotJoinOwnRoom = 5,
    /// Entry fee must be positive.
    InvalidEntryFee = 6,
    /// Side must be 0 (heads) or 1 (tails).
    InvalidSide = 7,
    /// Only the room creator can perform this action.
    NotCreator = 8,
    /// An opponent already joined; the room can only be resolved.
    RoomAlreadyMatched = 9,
}

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum RoomStatus {
    /// Waiting for an opponent — no countdown yet.
    Open,
    /// Opponent joined — countdown running (10s entry + 5s flip).
    Matched,
    /// Coin flipped, winner paid out.
    Resolved,
    /// Creator cancelled while the room was still open.
    Cancelled,
}

/// Coin sides. 0 = Heads, 1 = Tails.
pub const SIDE_HEADS: u32 = 0;
pub const SIDE_TAILS: u32 = 1;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Room {
    pub id: u64,
    pub creator: Address,
    /// The side the creator bet on: 0 = heads, 1 = tails.
    pub creator_side: u32,
    pub opponent: Option<Address>,
    /// Entry fee per player, in stroops (1 XLM = 10^7 stroops).
    pub entry_fee: i128,
    pub created_at: u64,
    /// Unix time when the 10s entry window ends (0 while open).
    pub entry_deadline: u64,
    /// Unix time when the flip may be resolved (0 while open).
    pub resolve_at: u64,
    pub status: RoomStatus,
    pub winner: Option<Address>,
    /// Flip outcome: 0 = heads, 1 = tails.
    pub result: Option<u32>,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Token used for entry fees (native XLM SAC).
    Token,
    /// Total number of rooms ever created.
    RoomCount,
    /// Room data by id.
    Room(u64),
}

#[contract]
pub struct CoinFlipContract;

#[contractimpl]
impl CoinFlipContract {
    /// Contract constructor. `token` is the SAC address used for entry fees
    /// (native XLM on testnet: CDLZ...CYSC).
    pub fn __constructor(env: Env, token: Address) {
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::RoomCount, &0u64);
    }

    /// Create a new room. Locks `entry_fee` from `creator` into the contract.
    /// The room waits for an opponent indefinitely — no countdown starts yet.
    /// Returns the new room id.
    pub fn create_room(
        env: Env,
        creator: Address,
        entry_fee: i128,
        side: u32,
    ) -> Result<u64, Error> {
        creator.require_auth();

        if entry_fee <= 0 {
            return Err(Error::InvalidEntryFee);
        }
        if side != SIDE_HEADS && side != SIDE_TAILS {
            return Err(Error::InvalidSide);
        }

        // Lock the entry fee in the contract.
        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token_id).transfer(
            &creator,
            &env.current_contract_address(),
            &entry_fee,
        );

        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::RoomCount)
            .unwrap_or(0);
        let now = env.ledger().timestamp();

        let room = Room {
            id,
            creator: creator.clone(),
            creator_side: side,
            opponent: None,
            entry_fee,
            created_at: now,
            entry_deadline: 0,
            resolve_at: 0,
            status: RoomStatus::Open,
            winner: None,
            result: None,
        };

        Self::save_room(&env, &room);
        env.storage().instance().set(&DataKey::RoomCount, &(id + 1));
        Self::extend_instance(&env);

        env.events()
            .publish((symbol_short!("created"), id), (creator, entry_fee, side));

        Ok(id)
    }

    /// Join an open room by matching its entry fee. This is the moment the
    /// countdown starts: 10s entry window, then 5s until the flip.
    pub fn join_room(env: Env, room_id: u64, opponent: Address) -> Result<(), Error> {
        opponent.require_auth();

        let mut room = Self::load_room(&env, room_id)?;

        if room.status != RoomStatus::Open {
            return Err(Error::RoomNotOpen);
        }
        if opponent == room.creator {
            return Err(Error::CannotJoinOwnRoom);
        }

        // Lock the opponent's matching entry fee.
        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token_id).transfer(
            &opponent,
            &env.current_contract_address(),
            &room.entry_fee,
        );

        let now = env.ledger().timestamp();
        room.opponent = Some(opponent.clone());
        room.status = RoomStatus::Matched;
        room.entry_deadline = now + ENTRY_WINDOW_SECS;
        room.resolve_at = now + ENTRY_WINDOW_SECS + RESOLVE_DELAY_SECS;
        Self::save_room(&env, &room);

        env.events().publish(
            (symbol_short!("joined"), room_id),
            (opponent, room.entry_fee, room.resolve_at),
        );

        Ok(())
    }

    /// Flip the coin and pay the winner the whole pot. Callable by anyone
    /// once the full countdown (10s entry + 5s flip) has elapsed since the
    /// opponent joined. Returns the winner.
    pub fn resolve_room(env: Env, room_id: u64) -> Result<Address, Error> {
        let mut room = Self::load_room(&env, room_id)?;

        if room.status == RoomStatus::Resolved || room.status == RoomStatus::Cancelled {
            return Err(Error::AlreadyFinalized);
        }
        if room.status != RoomStatus::Matched {
            return Err(Error::RoomNotOpen);
        }
        let now = env.ledger().timestamp();
        if now < room.resolve_at {
            return Err(Error::CountdownNotFinished);
        }

        // Flip the coin using the protocol PRNG.
        // NOTE: sufficient for a demo game; for high-stakes use a
        // commit-reveal scheme or external randomness beacon.
        let flip: u64 = env.prng().gen_range(0..=1);
        let result = flip as u32;

        let opponent = room.opponent.clone().unwrap();
        let winner = if result == room.creator_side {
            room.creator.clone()
        } else {
            opponent.clone()
        };

        // Pay out the full pot.
        let pot = room.entry_fee * 2;
        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token_id).transfer(
            &env.current_contract_address(),
            &winner,
            &pot,
        );

        room.status = RoomStatus::Resolved;
        room.winner = Some(winner.clone());
        room.result = Some(result);
        Self::save_room(&env, &room);

        env.events().publish(
            (symbol_short!("resolved"), room_id),
            (winner.clone(), result, pot),
        );

        Ok(winner)
    }

    /// Cancel an open room that has no opponent yet. Refunds the creator's
    /// entry fee. Only the creator may cancel, and only before a match.
    pub fn cancel_room(env: Env, room_id: u64, caller: Address) -> Result<(), Error> {
        caller.require_auth();

        let mut room = Self::load_room(&env, room_id)?;

        if caller != room.creator {
            return Err(Error::NotCreator);
        }
        if room.status == RoomStatus::Resolved || room.status == RoomStatus::Cancelled {
            return Err(Error::AlreadyFinalized);
        }
        if room.status == RoomStatus::Matched {
            return Err(Error::RoomAlreadyMatched);
        }

        // Refund the creator.
        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token_id).transfer(
            &env.current_contract_address(),
            &room.creator,
            &room.entry_fee,
        );

        room.status = RoomStatus::Cancelled;
        Self::save_room(&env, &room);

        env.events().publish(
            (symbol_short!("cancelled"), room_id),
            (room.creator.clone(), room.entry_fee),
        );

        Ok(())
    }

    /// Get a single room by id.
    pub fn get_room(env: Env, room_id: u64) -> Result<Room, Error> {
        Self::load_room(&env, room_id)
    }

    /// Total number of rooms ever created.
    pub fn get_room_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::RoomCount)
            .unwrap_or(0)
    }

    /// Get up to `limit` most recent rooms, skipping `offset` from the newest.
    pub fn get_rooms(env: Env, offset: u64, limit: u32) -> Vec<Room> {
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::RoomCount)
            .unwrap_or(0);
        let mut rooms = Vec::new(&env);
        if count == 0 || offset >= count {
            return rooms;
        }
        let mut id = count - 1 - offset;
        let mut taken: u32 = 0;
        loop {
            if taken >= limit {
                break;
            }
            if let Ok(room) = Self::load_room(&env, id) {
                rooms.push_back(room);
                taken += 1;
            }
            if id == 0 {
                break;
            }
            id -= 1;
        }
        rooms
    }

    /// Token used for entry fees.
    pub fn get_token(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Token).unwrap()
    }

    // ---- internal helpers ------------------------------------------------

    fn load_room(env: &Env, room_id: u64) -> Result<Room, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Room(room_id))
            .ok_or(Error::RoomNotFound)
    }

    fn save_room(env: &Env, room: &Room) {
        let key = DataKey::Room(room.id);
        env.storage().persistent().set(&key, room);
        env.storage()
            .persistent()
            .extend_ttl(&key, ROOM_TTL_THRESHOLD, ROOM_TTL_EXTEND);
    }

    fn extend_instance(env: &Env) {
        env.storage()
            .instance()
            .extend_ttl(ROOM_TTL_THRESHOLD, ROOM_TTL_EXTEND);
    }
}

mod test;
