// Whitelists and sanitises the fields each collection accepts from the client.
const str = max => v => (v == null ? "" : String(v).slice(0, max).trim())
const num = v => {
    const n = Number(v)
    return Number.isFinite(n) ? Math.round(n * 1e6) / 1e6 : 0
}
const bool = v => v === true || v === "true"
const date = v => {
    const s = String(v || "")
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : new Date().toISOString().slice(0, 10)
}
const oneOf = (options, fallback) => v => (options.includes(v) ? v : fallback)

const schemas = {
    transactions: {
        type: oneOf(["expense", "income"], "expense"),
        amount: v => Math.abs(num(v)),
        title: str(120),
        category: str(60),
        account: str(60),
        date,
        note: str(500),
    },
    trades: {
        side: oneOf(["buy", "sell"], "buy"),
        date,
        name: str(120),
        ticker: v => str(20)(v).toUpperCase(),
        market: oneOf(["ASX", "US", "OTHER"], "ASX"),
        price: v => Math.abs(num(v)),
        quantity: v => Math.abs(num(v)),
        brokerage: v => Math.abs(num(v)),
        note: str(300),
    },
    snapshots: {
        date,
        accounts: v =>
            (Array.isArray(v) ? v : []).slice(0, 100).map(a => ({
                name: str(60)(a.name),
                type: oneOf(["bank", "credit", "asset"], "bank")(a.type),
                balance: num(a.balance),
            })),
        cash: num,
        credit: num,
        otherAssets: num,
        investments: num,
        owed: num,
        liquid: num,
        liquidPlusOwed: num,
        netWorth: num,
        netWorthPlusOwed: num,
        note: str(300),
    },
    debts: {
        person: str(60),
        amount: v => Math.abs(num(v)),
        reason: str(200),
        date,
        settled: bool,
        settledDate: v => (v ? date(v) : ""),
    },
}

function sanitize(collection, body, { partial = false } = {}) {
    const schema = schemas[collection]
    const out = {}
    for (const [key, fn] of Object.entries(schema)) {
        if (partial && !(key in body)) continue
        out[key] = fn(body[key])
    }
    return out
}

function sanitizeSettings(body) {
    const out = {}
    if (Array.isArray(body.accounts)) {
        out.accounts = body.accounts.slice(0, 100).map(a => ({
            id: str(40)(a.id),
            name: str(60)(a.name),
            type: oneOf(["bank", "credit", "asset"], "bank")(a.type),
            balance: num(a.balance),
            limit: num(a.limit),
        }))
    }
    if (body.categories && typeof body.categories === "object") {
        const list = v =>
            (Array.isArray(v) ? v : []).slice(0, 60).map(c => ({
                name: str(60)(c.name),
                icon: str(40)(c.icon),
                excluded: bool(c.excluded),
            })).filter(c => c.name)
        out.categories = { expense: list(body.categories.expense), income: list(body.categories.income) }
    }
    if (body.prices && typeof body.prices === "object") {
        out.prices = {}
        for (const [ticker, p] of Object.entries(body.prices).slice(0, 300)) {
            out.prices[str(20)(ticker).toUpperCase()] = {
                price: num(p.price),
                prevClose: num(p.prevClose),
                currency: str(8)(p.currency),
                updatedAt: str(40)(p.updatedAt),
                manual: bool(p.manual),
            }
        }
    }
    if (body.preferences && typeof body.preferences === "object") {
        out.preferences = {
            convertForeign: bool(body.preferences.convertForeign),
            baseCurrency: str(8)(body.preferences.baseCurrency) || "AUD",
            defaultExpenseAccount: str(40)(body.preferences.defaultExpenseAccount),
            defaultIncomeAccount: str(40)(body.preferences.defaultIncomeAccount),
        }
    }
    return out
}

module.exports = { schemas, sanitize, sanitizeSettings }
