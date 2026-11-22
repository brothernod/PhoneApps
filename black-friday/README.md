# Black Friday

A shared Black Friday list for two iPhones. Each of you sorts ideas into Must / Want / Maybe and drags them into order. The Together view averages both rankings, each tier shows its subtotal and a running total, and the price tag at the top shows what everything left would cost. Mark things bought to track what you actually spent.

Link: https://brothernod.github.io/PhoneApps/black-friday/

## How it's put together

- The page in this folder is static and served by GitHub Pages.
- `worker/` is a Cloudflare Worker that stores the list. One Durable Object with SQLite storage holds the ideas, both rankings, the budget, and pasted photos. It also reads product pages to fill in the photo, name and price when you paste a link.
- Every request needs the shared key (`LIST_KEY`). The key travels in the part of the link after `#`, which browsers never send to GitHub.
- Each phone polls about every 8 seconds, so changes from the other phone show up on their own.

## Setup (once, from a phone)

1. Sign up at dash.cloudflare.com (the free plan is enough). Open **Workers & Pages** once. If it asks you to pick a `workers.dev` subdomain, pick one.
2. In Cloudflare, go to **My Profile > API Tokens > Create Token** and use the **Edit Cloudflare Workers** template. Copy the token. Your **Account ID** is on the Workers & Pages overview page.
3. In this repo, go to **Settings > Secrets and variables > Actions** and add three secrets:
   - `CLOUDFLARE_API_TOKEN`: the token
   - `CLOUDFLARE_ACCOUNT_ID`: the account ID
   - `BF_LIST_KEY`: any long random string. This is the list's password.
4. Under **Actions > Deploy Black Friday worker**, tap **Run workflow**. The run summary shows the Worker address, for example `https://black-friday.yourname.workers.dev`.
5. Open the link above, tap **First-time setup**, and enter the Worker address and `BF_LIST_KEY`. Pick Jonathan. Tap **Load the 16 ideas**.
6. In Safari, tap Share, then **Add to Home Screen**.
7. In the app, open **Settings > Send Rachel's link**. Her link already says it's hers.

## Deploying from a computer instead

```sh
cd black-friday/worker
npx wrangler login
npx wrangler deploy
npx wrangler secret put LIST_KEY
```

## Running it locally

```sh
cd black-friday/worker
echo 'LIST_KEY="dev"' > .dev.vars
npx wrangler dev --port 8787
# in another terminal, from black-friday/
python3 -m http.server 8000
# then open http://localhost:8000/#api=http://localhost:8787&k=dev&me=jonathan
```

## Files

- `index.html`, `styles.css`, `app.js`: the app
- `seed.js`: the starting 16 ideas, with prices checked on Nov 22, 2026
- `vendor/Sortable.min.js`: drag and drop (SortableJS, MIT)
- `fonts/`: Archivo variable font (SIL Open Font License)
- `worker/`: the Cloudflare Worker
