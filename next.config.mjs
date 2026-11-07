/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",          // ได้เว็บนิ่ง ๆ ในโฟลเดอร์ out/ เอาไปวางที่ไหนก็ได้
  images: { unoptimized: true },
  trailingSlash: true,
  basePath: process.env.BASE_PATH || "",
};
export default nextConfig;
