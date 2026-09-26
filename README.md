# Ledger — Personal Finance Tracker

A personal finance web app that works on desktop and phone. It's built to be saved to an iPhone home screen and used like a native app.

| Page | What it does |
| --- | --- |
| **Add** | Quick entry for expenses and income: a large amount keypad, category tiles, Today/Yesterday date buttons, title autocomplete that remembers each title's category, tap a recent transaction to log it again, and an optional *split / someone owes me* that creates IOUs. |
| **Transactions** | Search by description, category, note or amount. Filter by type, category, account and date range, and sort. Grouped by day with daily totals. Tap a row to edit or delete it (with undo). CSV export. |
| **Insights** | Choose 1M / 3M / 6M / YTD / 1Y / All. Shows income, spending, net saved and savings rate compared with the previous period. Charts: cash flow, net savings per month, spending by category (click a category to focus on it), monthly category trends, month-to-date pace vs last month, average spend by weekday, where your money goes, largest expenses, and income sources. |
| **Investing → Portfolio** | Total value, cost, unrealised, realised and net profit. A holdings table (shares, average price, live price, cost, value, profit), an allocation donut, a *value vs amount invested* chart built from historical prices, and closed positions. |
| **Investing → Trades** | Record buys and sells. Entering a ticker auto-fills the stock name. Shows current holding and estimated realised P/L. Totals panel (brokerage, unique stocks, buy/sell orders, realised profit, total investing profit), profit by stock, full trade history, and **paste straight from your spreadsheet**. |
| **Net Worth** | Enter bank, credit card and other asset balances. Investments are pulled in live from the portfolio. Shows liquid net worth, liquid + owed, net worth and net worth + owed. **Save snapshot** stores a point in time, and the chart tracks net worth over time. |
| **Net Worth → Money Owed** | IOUs grouped by person. Mark them repaid (with undo) or settle everyone at once. Outstanding totals feed the "+ owed" figures. |
| **Settings** | Edit categories (rename, reorder, change icons, mark as *not spending*), default accounts for the Add screen, convert US prices to AUD, download or restore a JSON backup, sign out, and delete your account. |

**Not-spending categories:** expense categories marked ⇄ in Settings (e.g. **Investing**) are treated as money moved rather than spent. They appear as a separate *Invested* bar in cash flow but are left out of spending totals, category breakdowns and trends.

## How profit is calculated

Portfolio profit uses the **average-cost method**:

- Brokerage on a buy is added to the cost base.
- When you sell, realised P/L = net proceeds (price × qty − brokerage) − average cost × qty.
- Unrealised P/L = current value − remaining cost base.
- Net profit = unrealised + realised.

Live prices come from Yahoo Finance's public quote endpoint through the server, so no API key is needed. ASX tickers are looked up as `TICKER.AX`. If a price can't be found, tap it to set it manually.

## Run it locally

```bash
npm install
npm run dev          # API on :3000 + Vite on :5173 (also reachable from your phone on the same Wi-Fi)
```

Copy `.env.example` to `.env` and set `ATLAS_URI` to use MongoDB. If it isn't set, data goes to `server/data/db.json`, which is only intended for trying the app out. In production (`NODE_ENV=production`) the server refuses to start without `ATLAS_URI`.

## 1. Set up MongoDB Atlas (free)

1. Sign up at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas/register) and create a free **M0** cluster. Pick a Sydney region if one is offered.
2. **Database Access** → add a database user with a username and a generated password.
3. **Network Access** → *Add IP Address* → **Allow access from anywhere** (`0.0.0.0/0`). Hosting providers don't have fixed IPs; the database is still protected by your user and password.
4. **Connect** → *Drivers* → copy the connection string. It looks like
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
5. Put it in `.env` as `ATLAS_URI=...` (or in `config.env`, which the old version used and is also read).

### Move existing local data into MongoDB

If you've already been using the app locally, your data is in `server/data/db.json`. Copy it across with:

```bash
npm run migrate:mongo
```

It copies your login, transactions, trades, snapshots, IOUs and settings. It's safe to run more than once, because accounts that already exist in MongoDB are skipped. Restart `npm run dev` afterwards; the console should say `storage: mongo`.

## 2. Host it (access from your phone or any computer)

The server serves both the API and the website, so you only deploy one service. The repo includes a `render.yaml` for **Render**:

1. Push this branch to GitHub (merge it into `main` if you want Render to track `main`).
2. Go to [render.com](https://render.com), sign in with GitHub, then **New → Blueprint** and pick this repository.
3. When prompted, paste your Atlas connection string into `ATLAS_URI`. `JWT_SECRET` is generated for you.
4. Deploy. You'll get a URL like `https://ledger-xxxx.onrender.com`.
5. Open it, create your account, then in Render → *Environment* set `ALLOW_REGISTRATION=false` so nobody else can sign up.
6. **iPhone:** open the URL in Safari → **Share → Add to Home Screen**. **Computer:** bookmark the URL.

Every push to the tracked branch redeploys automatically. Your data lives in Atlas, so redeploys never touch it.

**About the free plan:** Render's free service goes to sleep after about 15 minutes idle, and the first visit afterwards takes roughly 30–60 seconds to wake it. To avoid that, upgrade the service to Render's *Starter* plan, or use a free uptime pinger (e.g. cron-job.org) to request `https://your-url/api/health` every 10 minutes.

Other Node hosts (Railway, Fly.io, a VPS) work the same way: build with `npm ci --include=dev && npm run build`, start with `npm start`, and set `NODE_ENV=production`, `ATLAS_URI` and `JWT_SECRET`.

## Stack

React 19, React Router 7, Tailwind CSS 4, Recharts, Express 5, MongoDB (or a JSON file store), bcrypt-hashed passwords with JWT sessions.
