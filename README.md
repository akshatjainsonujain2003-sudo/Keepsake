# Keepsake on Vercel
Static site: index.html + vercel.json. No build step.

Deploy (pick one):
1. vercel.com/new -> import a GitHub repo containing these files (Framework: Other, no build command).
2. CLI: `npm i -g vercel && cd keepsake-vercel && vercel --prod`

Then open your production URL; the "address" box fills itself in. Use that URL for QR/NFC.
If scanners show a Vercel login, turn off Deployment Protection (Project -> Settings -> Deployment Protection) and use the production domain, not a preview URL.
