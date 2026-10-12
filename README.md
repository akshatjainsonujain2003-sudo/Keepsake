# Keepsake

NFC and QR memory cards for the people you love. Customers design a card in the studio for free (photos, video, song, message, map), then pay once to activate it: digital only, or digital plus a printed NFC card delivered to them. No app needed to open a card.

Live: https://keepsake-h4ed.vercel.app

## Project layout

```
*.html          Pages (served without .html thanks to cleanUrls)
  index         Home
  designs       Theme gallery
  business      Paused: /business redirects to / (kept for when shops return)
  contact       Lead form
  login         Shop key log in (paused, hidden from menus and search)
  account       Customer account
  reset-password
  studio        Card editor; also renders cards at /c/:id and /m/:id
  dashboard     Customer's saved memories: live or not, edit, activate
  admin         Admin panel: paid orders, NFC cards to ship, enquiries, shops
assets/         Theme images (name.webp), thumbnails (t-name.webp), CSS and JS
api/            Vercel serverless functions
  _db.js        Tiny Upstash / Vercel KV REST client (shared helper)
  _pay.js       Prices and Razorpay helpers (shared helper)
  admin.js      Orders, shipping, enquiries and shop keys
  checkout.js   Razorpay checkout: create order, verify payment
  razorpay-webhook.js  Activates paid cards even if the customer closes the page
  card.js       Save and load cards
  customer-auth.js, customer-memories.js   Customer accounts
  img.js        Image storage
  lead.js       Contact form leads
  shop.js       Shop key login
  shorten.js    Short links (only for this site's own URLs)
  sitemap.js    /sitemap.xml
  robots.js     /robots.txt
vercel.json     Rewrites, security headers, asset caching
```

There is no build step and no npm dependencies.

## Deploy on Vercel

1. Import this repo at vercel.com/new (Framework: Other, no build command).
2. Add a Redis store (Upstash via the Vercel Marketplace). Its REST URL and token env vars are picked up automatically.
3. Set these environment variables:
   - `ADMIN_KEY`: password for the admin panel
   - `RESEND_API_KEY` and `RESEND_FROM_EMAIL`: for customer password reset emails
   - `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`: from Razorpay Dashboard → Account & Settings → API Keys
   - `RAZORPAY_WEBHOOK_SECRET`: a secret you choose when adding the webhook below
   - Optional: `PRICE_DIGITAL` and `PRICE_NFC` in rupees (defaults 99 and 349). An NFC card for an already active card costs the difference.
4. In Razorpay Dashboard → Webhooks, add `https://<your-domain>/api/razorpay-webhook` with the events `payment.captured` and `order.paid`, using the same webhook secret. Keep payment capture set to automatic.
5. Use the production domain (not a preview URL) for QR codes and NFC tags. If scanners hit a Vercel login, turn off Deployment Protection in Project Settings.

## Notes

- New cards start inactive. Only their owner can preview them until paid. Cards saved before payments were added stay live.
- Only files in `api/` run as server functions. Files elsewhere are served as static files.
- Every page loads images, CSS and JS from `/assets/`, which is cached for a year. When changing an asset, rename it so visitors get the new version.
