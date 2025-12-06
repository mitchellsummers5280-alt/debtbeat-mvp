/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Allow Next/Image to load Google profile pictures
    domains: ["lh3.googleusercontent.com"],
    // (you can add more domains here later if needed)
  },
};

module.exports = nextConfig;
