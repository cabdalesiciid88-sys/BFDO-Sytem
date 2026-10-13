import type { NextConfig } from "next";

// No nonce-based CSP (would need per-request nonce generation wired through
// middleware into every <script>/<style> tag) — out of scope for this pass,
// tracked as a known gap in docs/security.md. 'unsafe-inline' is required
// here because Next.js's own hydration bootstrap script and this project's
// Tailwind/Base UI styling both rely on inline script/style without that
// nonce infrastructure. Still meaningfully restricts the two things CSP is
// most commonly bypassed through: no third-party script origins, and no
// plugin/object embeds.
// Next.js dev mode's React Refresh / error-overlay tooling legitimately
// uses eval() for debugging (stack reconstruction across module
// boundaries) — production never does (confirmed: React logs "will never
// use eval() in production mode" when this fires). Scoping 'unsafe-eval'
// to development only keeps the production policy as tight as documented
// above, while not spamming the dev console with a warning about
// something that was never a production concern.
const SCRIPT_SRC =
  process.env.NODE_ENV === "production" ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  SCRIPT_SRC,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Browsers only honor this over HTTPS, which is all a production request
  // ever should be — Hostinger/cPanel's AutoSSL terminates TLS in front of
  // this app (docs/architecture.md), so there's no HTTP-only deployment
  // path where sending this would be premature.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
];

const nextConfig: NextConfig = {
  // Required for cPanel/Passenger deployment (Hostinger): produces a
  // self-contained server bundle (.next/standalone) that Passenger can run
  // directly with `node server.js` instead of needing `next start`.
  output: "standalone",
  // Don't advertise the framework in responses.
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
