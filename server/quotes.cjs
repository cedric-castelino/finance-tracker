// Thin proxy over Yahoo Finance's public chart endpoint (no API key needed).
const CACHE_MS = 5 * 60 * 1000
const cache = new Map()

async function fetchChart(symbol, range = "5d", interval = "1d") {
    const key = `${symbol}|${range}|${interval}`
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.data

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error(`Quote lookup failed for ${symbol} (${res.status})`)
    const json = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) throw new Error(`No data for ${symbol}`)
    cache.set(key, { at: Date.now(), data: result })
    return result
}

const SYMBOL_RE = /^[A-Z0-9.=^-]{1,20}$/

function parseSymbols(raw) {
    return String(raw || "")
        .split(",")
        .map(s => s.trim().toUpperCase())
        .filter(s => SYMBOL_RE.test(s))
        .slice(0, 60)
}

async function getQuotes(symbols) {
    const out = {}
    await Promise.all(
        symbols.map(async symbol => {
            try {
                const r = await fetchChart(symbol)
                const m = r.meta
                const closes = (r.indicators?.quote?.[0]?.close || []).filter(v => v != null)
                out[symbol] = {
                    price: m.regularMarketPrice,
                    prevClose: closes.length > 1 ? closes[closes.length - 2] : m.chartPreviousClose,
                    currency: m.currency,
                    name: m.longName || m.shortName || "",
                    exchange: m.exchangeName,
                }
            } catch (err) {
                out[symbol] = { error: err.message }
            }
        })
    )
    return out
}

async function getHistory(symbols, range) {
    const allowed = ["3mo", "6mo", "1y", "2y", "5y", "max"]
    const r = allowed.includes(range) ? range : "1y"
    const interval = ["3mo", "6mo"].includes(r) ? "1d" : "1wk"
    const out = {}
    await Promise.all(
        symbols.map(async symbol => {
            try {
                const res = await fetchChart(symbol, r, interval)
                const ts = res.timestamp || []
                const closes = res.indicators?.quote?.[0]?.close || []
                out[symbol] = {
                    currency: res.meta.currency,
                    points: ts
                        .map((t, i) => [new Date(t * 1000).toISOString().slice(0, 10), closes[i]])
                        .filter(p => p[1] != null),
                }
            } catch (err) {
                out[symbol] = { error: err.message }
            }
        })
    )
    return out
}

module.exports = { getQuotes, getHistory, parseSymbols }
