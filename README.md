# Emberveil

Emberveil is an online fantasy card game with illustrated leader decks, free-for-all and team PvP, and co-op against Sentinel bots. The server runs as a Cloudflare Worker and stores match state in D1.

## Local development

Use Node.js 22.13 or later. Run `npm start` and open `http://localhost:3000`. The local server uses SQLite and the same Worker bundle as production.

## Deploy to your Cloudflare account

Run these commands in the repository root with Wrangler 4 and access to the Cloudflare account that will own the Worker and database.

1. Authenticate with `npx wrangler@4 login` and confirm the account with `npx wrangler@4 whoami`.
2. Run `npx wrangler@4 d1 create emberveil`. Copy `wrangler.example.jsonc` to `wrangler.jsonc` and replace `REPLACE_WITH_D1_DATABASE_ID` with the returned database ID. If your login spans multiple accounts, set `account_id` in the local config.
3. Apply the schema and deploy.

   ```sh
   npx wrangler@4 d1 migrations apply DB --remote
   npx wrangler@4 deploy
   ```

4. On the Worker URL printed by Wrangler, verify that the lobby and card artwork load. Create a room, have another browser join and start the match, then start a separate co-op match and confirm the bots take a turn.
5. Once verified, add `emberveil.iamfatness.us` as a **Custom Domain** on the Worker in Cloudflare under **Settings → Domains & Routes**. Cloudflare manages the DNS record and certificate. If there is an existing record at that exact hostname, inspect it before changing it. Verify that the game and room invite links work on the new HTTPS address.

The new D1 database starts empty. Existing ChatGPT Sites rooms stay on their original deployment unless they are explicitly migrated. Browser sessions are origin-specific, so plan for players to start new rooms at cutover unless you also design a session migration.
