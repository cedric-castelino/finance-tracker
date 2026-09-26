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
| **Settings** | Edit categories (rename, reorder, change icons), convert US prices to AUD, download or restore a JSON backup, sign out, and delete your account. |

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
npm run dev          # API on :3000 + Vite on :5173 (opens on your LAN too, so you can test from your phone)
```

With no `ATLAS_URI` set, data is saved to `server/data/db.json`, which is git-ignored. To use MongoDB, copy `.env.example` to `.env` and fill in `ATLAS_URI` and `JWT_SECRET`.

Production build:

```bash
npm run build
npm start            # serves the API and the built site on one port
```

## Deploy (so it works on your phone anywhere)

The server serves both the API and the frontend, so any Node host works. For example, with **Render**:

1. Create a free MongoDB Atlas cluster and copy its connection string. Under *Network Access*, allow `0.0.0.0/0`.
2. On Render, create a **Web Service** from this repo.
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Environment: `ATLAS_URI`, `JWT_SECRET` (a long random string) and, once you've registered, `ALLOW_REGISTRATION=false`.
3. Open the URL in **Safari on your iPhone**, tap **Share → Add to Home Screen**, then launch *Ledger* from the home screen.

> Always use MongoDB when deploying. Most hosts wipe the local disk on every deploy, which would erase `db.json`.

## Stack

React 19, React Router 7, Tailwind CSS 4, Recharts, Express 5, MongoDB (or a JSON file store), bcrypt-hashed passwords with JWT sessions.
