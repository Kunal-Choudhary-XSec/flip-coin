#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, Env,
};

fn setup(
    env: &Env,
) -> (
    CoinFlipContractClient<'_>,
    TokenClient<'_>,
    Address,
    Address,
) {
    env.mock_all_auths();

    let token_admin = Address::generate(env);
    let sac = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token = TokenClient::new(env, &sac.address());
    let token_sac = StellarAssetClient::new(env, &sac.address());

    let contract_id = env.register(CoinFlipContract, (sac.address(),));
    let client = CoinFlipContractClient::new(env, &contract_id);

    let alice = Address::generate(env);
    let bob = Address::generate(env);
    token_sac.mint(&alice, &1_000_0000000);
    token_sac.mint(&bob, &1_000_0000000);

    (client, token, alice, bob)
}

fn advance_time(env: &Env, secs: u64) {
    env.ledger().with_mut(|l| l.timestamp += secs);
}

#[test]
fn test_create_room_locks_fee_without_countdown() {
    let env = Env::default();
    let (client, token, alice, _) = setup(&env);

    let fee: i128 = 10_0000000;
    let id = client.create_room(&alice, &fee, &SIDE_HEADS);

    assert_eq!(id, 0);
    assert_eq!(token.balance(&alice), 990_0000000);
    assert_eq!(token.balance(&client.address), fee);

    let room = client.get_room(&id);
    assert_eq!(room.status, RoomStatus::Open);
    assert_eq!(room.entry_fee, fee);
    assert_eq!(room.creator_side, SIDE_HEADS);
    // No countdown until an opponent joins.
    assert_eq!(room.entry_deadline, 0);
    assert_eq!(room.resolve_at, 0);
    assert_eq!(client.get_room_count(), 1);
}

#[test]
fn test_join_starts_countdown() {
    let env = Env::default();
    let (client, token, alice, bob) = setup(&env);

    let fee: i128 = 25_0000000;
    let id = client.create_room(&alice, &fee, &SIDE_HEADS);

    // Room can be joined even long after creation — no expiry while open.
    advance_time(&env, 3_600);
    client.join_room(&id, &bob);

    let room = client.get_room(&id);
    let now = env.ledger().timestamp();
    assert_eq!(room.status, RoomStatus::Matched);
    assert_eq!(room.opponent, Some(bob.clone()));
    // Countdown starts at the join: 10s entry window + 5s flip delay.
    assert_eq!(room.entry_deadline, now + ENTRY_WINDOW_SECS);
    assert_eq!(
        room.resolve_at,
        now + ENTRY_WINDOW_SECS + RESOLVE_DELAY_SECS
    );
    assert_eq!(token.balance(&client.address), fee * 2);
}

#[test]
fn test_resolve_after_countdown_pays_winner() {
    let env = Env::default();
    let (client, token, alice, bob) = setup(&env);

    let fee: i128 = 25_0000000;
    let id = client.create_room(&alice, &fee, &SIDE_HEADS);
    client.join_room(&id, &bob);

    advance_time(&env, ENTRY_WINDOW_SECS + RESOLVE_DELAY_SECS);
    let winner = client.resolve_room(&id);

    let room = client.get_room(&id);
    assert_eq!(room.status, RoomStatus::Resolved);
    assert_eq!(room.winner, Some(winner.clone()));
    assert!(winner == alice || winner == bob);
    assert_eq!(token.balance(&client.address), 0);
    assert_eq!(token.balance(&winner), 1_000_0000000 + fee);
}

#[test]
fn test_resolve_during_countdown_fails() {
    let env = Env::default();
    let (client, _, alice, bob) = setup(&env);

    let id = client.create_room(&alice, &10_0000000, &SIDE_HEADS);
    client.join_room(&id, &bob);

    // Still inside the 10s entry window.
    let res = client.try_resolve_room(&id);
    assert_eq!(res, Err(Ok(Error::CountdownNotFinished)));

    // Entry window over, but still inside the 5s flip delay.
    advance_time(&env, ENTRY_WINDOW_SECS + RESOLVE_DELAY_SECS - 1);
    let res = client.try_resolve_room(&id);
    assert_eq!(res, Err(Ok(Error::CountdownNotFinished)));
}

#[test]
fn test_cannot_join_own_room() {
    let env = Env::default();
    let (client, _, alice, _) = setup(&env);

    let id = client.create_room(&alice, &10_0000000, &SIDE_HEADS);
    let res = client.try_join_room(&id, &alice);
    assert_eq!(res, Err(Ok(Error::CannotJoinOwnRoom)));
}

#[test]
fn test_cannot_join_matched_room() {
    let env = Env::default();
    let (client, token, alice, bob) = setup(&env);
    let token_sac = StellarAssetClient::new(&env, &token.address);

    let carol = Address::generate(&env);
    token_sac.mint(&carol, &1_000_0000000);

    let id = client.create_room(&alice, &10_0000000, &SIDE_HEADS);
    client.join_room(&id, &bob);

    let res = client.try_join_room(&id, &carol);
    assert_eq!(res, Err(Ok(Error::RoomNotOpen)));
}

#[test]
fn test_cancel_open_room_refunds_creator() {
    let env = Env::default();
    let (client, token, alice, _) = setup(&env);

    let fee: i128 = 15_0000000;
    let id = client.create_room(&alice, &fee, &SIDE_HEADS);

    // Creator can cancel anytime while the room is open.
    client.cancel_room(&id, &alice);

    let room = client.get_room(&id);
    assert_eq!(room.status, RoomStatus::Cancelled);
    assert_eq!(token.balance(&alice), 1_000_0000000);
    assert_eq!(token.balance(&client.address), 0);
}

#[test]
fn test_cancel_matched_room_fails() {
    let env = Env::default();
    let (client, _, alice, bob) = setup(&env);

    let id = client.create_room(&alice, &10_0000000, &SIDE_HEADS);
    client.join_room(&id, &bob);

    let res = client.try_cancel_room(&id, &alice);
    assert_eq!(res, Err(Ok(Error::RoomAlreadyMatched)));
}

#[test]
fn test_cancel_by_non_creator_fails() {
    let env = Env::default();
    let (client, _, alice, bob) = setup(&env);

    let id = client.create_room(&alice, &10_0000000, &SIDE_HEADS);
    let res = client.try_cancel_room(&id, &bob);
    assert_eq!(res, Err(Ok(Error::NotCreator)));
}

#[test]
fn test_invalid_inputs() {
    let env = Env::default();
    let (client, _, alice, _) = setup(&env);

    assert_eq!(
        client.try_create_room(&alice, &0, &SIDE_HEADS),
        Err(Ok(Error::InvalidEntryFee))
    );
    assert_eq!(
        client.try_create_room(&alice, &10_0000000, &2),
        Err(Ok(Error::InvalidSide))
    );
    assert_eq!(client.try_get_room(&99), Err(Ok(Error::RoomNotFound)));
}

#[test]
fn test_get_rooms_pagination() {
    let env = Env::default();
    let (client, _, alice, _) = setup(&env);

    for _ in 0..5 {
        client.create_room(&alice, &1_0000000, &SIDE_HEADS);
    }

    let rooms = client.get_rooms(&0, &3);
    assert_eq!(rooms.len(), 3);
    assert_eq!(rooms.get(0).unwrap().id, 4); // newest first

    let rooms = client.get_rooms(&3, &10);
    assert_eq!(rooms.len(), 2);
    assert_eq!(rooms.get(0).unwrap().id, 1);
}
