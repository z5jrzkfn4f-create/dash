# TikTok Link Hub

Transparent TikTok link rotation with Netlify Functions and Upstash Redis.

## Deploy
1. Upload the contents of this folder to a GitHub repository.
2. In Netlify, import that repository. Build command: blank. Publish directory: `public`. Functions directory: `netlify/functions`.
3. Create an Upstash Redis database and copy its REST URL and REST token.
4. In Netlify Site configuration → Environment variables, add `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `ADMIN_PASSWORD`, `SESSION_SECRET`, and `SEED_SECRET`. Never commit these secrets to GitHub.
5. Deploy. Visit `/admin` and sign in with `ADMIN_PASSWORD`.
6. Initialize the supplied 10 links once by POSTing to `/.netlify/functions/seed` with header `x-seed-secret: YOUR_SEED_SECRET`. Example: `curl -X POST https://YOUR-SITE.netlify.app/.netlify/functions/seed -H 'x-seed-secret: YOUR_SEED_SECRET'`. This endpoint refuses to overwrite existing links. After successful initialization, remove `SEED_SECRET` from Netlify and redeploy.
7. Test `/` and click Continue to TikTok. Check `/admin` for counts.

Generate secrets locally: `openssl rand -base64 48` (run separately for SESSION_SECRET and SEED_SECRET).

## Behavior and limitations
- The public landing page discloses that clicking the button rotates destinations.
- Redis Lua atomically selects the next enabled destination and increments its counter, including concurrent requests.
- Counts mean the redirect was issued, not that TikTok loaded or a person viewed the destination.
- Disabled links are skipped; their counts remain. Deleting a link removes it from rotation but retains its counter in Redis.
- Admin session uses a signed, HTTP-only, Secure, SameSite cookie with an 8-hour expiry.
- Add Netlify rate limiting/WAF to protect the login endpoint. Use a strong admin password and keep all credentials server-side.
