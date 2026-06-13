/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Stockfish runs single-threaded, so we do NOT need cross-origin isolation
  // (COOP/COEP) headers. This keeps the app simple and iOS-Safari friendly.
};

export default nextConfig;
