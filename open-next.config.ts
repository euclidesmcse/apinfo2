import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default OpenNext config for Cloudflare (no incremental cache: every route is force-dynamic).
export default defineCloudflareConfig();
