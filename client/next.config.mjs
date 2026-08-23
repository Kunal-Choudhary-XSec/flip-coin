/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Required for @stellar/stellar-sdk / sodium-native optional deps in the browser bundle
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    config.externals = [...(config.externals ?? []), "sodium-native", "require-addon"];
    return config;
  },
};

export default nextConfig;
