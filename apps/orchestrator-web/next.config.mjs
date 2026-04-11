import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import("next").NextConfig} */
const nextConfig = {
  // Required for multi-stage Docker builds (Dockerfile copies .next/standalone)
  output: "standalone",

  // In Docker, pnpm installs workspace dependencies at the monorepo root.
  // Include the repo root in output tracing so standalone output contains Next.
  outputFileTracingRoot: join(__dirname, "../../"),

  // Strict mode for catching React issues early
  reactStrictMode: true,

  // Expose public API URL to the browser bundle
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  },
};

export default nextConfig;
