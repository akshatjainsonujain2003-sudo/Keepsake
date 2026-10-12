# Keepsake

NFC and QR memory cards for gifts and businesses. People design a card in the studio (photos, video, song, message, map, review and WhatsApp buttons), then share it with a short link, QR code or NFC tag. No app needed to open a card.

Live: https://keepsake-h4ed.vercel.app

## Project layout

```
*.html          Pages (served without .html thanks to cleanUrls)
  index         Home
  designs       Theme gallery
  business      Keepsake for business
  contact       Lead form
  login         Shop key log in
  account       Customer account
  reset-password
  studio        Card editor; also renders cards at /c/:id and /m/:id
  dashboard     Customer's saved memories
  admin         Admin panel
assets/         Theme images (name.webp), thumbnails (t-name.webp), CSS and JS
api/            Vercel serverless functions
  _db.js        Tiny Upstash / Vercel KV REST client (shared helper)
  admin.js      Shop key management
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
4. Use the production domain (not a preview URL) for QR codes and NFC tags. If scanners hit a Vercel login, turn off Deployment Protection in Project Settings.

## Notes

- Only files in `api/` run as server functions. Files elsewhere are served as static files.
- Every page loads images, CSS and JS from `/assets/`, which is cached for a year. When changing an asset, rename it so visitors get the new version.
