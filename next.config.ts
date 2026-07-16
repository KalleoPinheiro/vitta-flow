import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  serverExternalPackages: ["pg", "@electric-sql/pglite", "googleapis"],
};

export default nextConfig;
