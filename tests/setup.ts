import { config } from "dotenv";

// Loaded before any test file — and critically, before lib/db/client.ts is
// first imported anywhere in the test run — so DATABASE_URL points at the
// dedicated bfdo_management_test database, never the dev database used for
// manual browser verification. See .env.test and docs/testing.md.
config({ path: ".env.test", override: true });
