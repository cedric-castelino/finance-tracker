require("dotenv").config({ path: require("path").join(__dirname, "..", "config.env") })
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") })

const fs = require("fs")
const path = require("path")
const crypto = require("crypto")
const express = require("express")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { createStore } = require("./db.cjs")
const { schemas, sanitize, sanitizeSettings } = require("./schemas.cjs")
const { defaultSettings, upgradeSettings } = require("./defaults.cjs")
const { getQuotes, getHistory, parseSymbols } = require("./quotes.cjs")

const PORT = process.env.PORT || 3000
const DATA_COLLECTIONS = Object.keys(schemas)
const ALLOW_REGISTRATION = process.env.ALLOW_REGISTRATION !== "false"

function loadSecret() {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET
    const file = path.join(__dirname, "data", ".jwt-secret")
    if (fs.existsSync(file)) return fs.readFileSync(file, "utf8")
    const secret = crypto.randomBytes(48).toString("hex")
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, secret)
    console.warn("JWT_SECRET not set - generated one in server/data/.jwt-secret. Set JWT_SECRET when deploying.")
    return secret
}
const JWT_SECRET = loadSecret()

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// Very small in-memory throttle for auth endpoints.
const attempts = new Map()
function throttle(req, res, next) {
    const key = req.ip
    const now = Date.now()
    const entry = attempts.get(key) || { count: 0, start: now }
    if (now - entry.start > 15 * 60 * 1000) {
        entry.count = 0
        entry.start = now
    }
    entry.count++
    attempts.set(key, entry)
    if (entry.count > 30) return res.status(429).json({ error: "Too many attempts. Try again in a few minutes." })
    next()
}

function requireAuth(req, res, next) {
    const header = req.headers.authorization || ""
    const token = header.startsWith("Bearer ") ? header.slice(7) : null
    if (!token) return res.status(401).json({ error: "Not signed in" })
    try {
        req.userId = jwt.verify(token, JWT_SECRET).sub
        next()
    } catch {
        res.status(401).json({ error: "Session expired, please sign in again" })
    }
}

const signToken = user => jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "180d" })
const publicUser = u => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    apiKey: u.apiKeyHash ? { hint: u.apiKeyHint, createdAt: u.apiKeyCreatedAt } : null,
})

// Personal API keys (for Apple Shortcuts etc.) are random 32-byte tokens; only a SHA-256 hash is stored.
const hashKey = key => crypto.createHash("sha256").update(key).digest("hex")
const API_KEY_PREFIX = "ldg_"

// "Today" for requests that don't send a date, in the user's timezone rather than the server's.
const DEFAULT_TZ = process.env.DEFAULT_TIMEZONE || "Australia/Sydney"
const todayIn = tz => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())

async function main() {
    const store = await createStore()
    const app = express()
    app.set("trust proxy", 1)
    app.use(cors())
    app.use(express.json({ limit: "10mb" }))

    const api = express.Router()

    // ---- Auth ----
    api.get("/health", (req, res) => res.json({ ok: true, storage: store.kind }))

    api.get("/auth/config", (req, res) => res.json({ allowRegistration: ALLOW_REGISTRATION }))

    api.post("/auth/register", throttle, asyncRoute(async (req, res) => {
        if (!ALLOW_REGISTRATION) return res.status(403).json({ error: "Registration is disabled" })
        const email = String(req.body.email || "").trim().toLowerCase()
        const password = String(req.body.password || "")
        const firstName = String(req.body.firstName || "").trim().slice(0, 60)
        const lastName = String(req.body.lastName || "").trim().slice(0, 60)
        if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Enter a valid email" })
        if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" })
        if (!firstName) return res.status(400).json({ error: "First name is required" })
        if (await store.findOne("users", { email })) return res.status(400).json({ error: "Email already in use" })

        const user = {
            id: crypto.randomUUID(),
            email,
            firstName,
            lastName,
            passwordHash: await bcrypt.hash(password, 10),
            createdAt: new Date().toISOString(),
        }
        await store.insertMany("users", [user])
        await store.insertMany("settings", [{ userId: user.id, ...defaultSettings() }])
        res.json({ token: signToken(user), user: publicUser(user) })
    }))

    api.post("/auth/login", throttle, asyncRoute(async (req, res) => {
        const email = String(req.body.email || "").trim().toLowerCase()
        const user = await store.findOne("users", { email })
        if (!user || !(await bcrypt.compare(String(req.body.password || ""), user.passwordHash))) {
            return res.status(400).json({ error: "Incorrect email or password" })
        }
        res.json({ token: signToken(user), user: publicUser(user) })
    }))

    api.get("/auth/me", requireAuth, asyncRoute(async (req, res) => {
        const user = await store.findOne("users", { id: req.userId })
        if (!user) return res.status(401).json({ error: "Account not found" })
        res.json({ user: publicUser(user) })
    }))

    api.post("/auth/api-key", requireAuth, asyncRoute(async (req, res) => {
        const key = API_KEY_PREFIX + crypto.randomBytes(32).toString("base64url")
        const user = await store.updateOne("users", { id: req.userId }, {
            apiKeyHash: hashKey(key),
            apiKeyHint: key.slice(-4),
            apiKeyCreatedAt: new Date().toISOString(),
        })
        if (!user) return res.status(401).json({ error: "Account not found" })
        res.json({ key, user: publicUser(user) })
    }))

    api.delete("/auth/api-key", requireAuth, asyncRoute(async (req, res) => {
        const user = await store.updateOne("users", { id: req.userId }, { apiKeyHash: null, apiKeyHint: null, apiKeyCreatedAt: null })
        res.json({ user: publicUser(user) })
    }))

    api.delete("/auth/account", requireAuth, asyncRoute(async (req, res) => {
        for (const col of [...DATA_COLLECTIONS, "settings"]) await store.deleteMany(col, { userId: req.userId })
        await store.deleteMany("users", { id: req.userId })
        res.json({ ok: true })
    }))

    // ---- Data ----
    async function getSettings(userId) {
        let s = await store.findOne("settings", { userId })
        if (!s) {
            s = { userId, ...defaultSettings() }
            await store.insertMany("settings", [s])
        }
        const upgrade = upgradeSettings(s)
        if (upgrade) s = await store.updateOne("settings", { userId }, upgrade)
        const { userId: _, ...rest } = s
        return rest
    }

    api.get("/data", requireAuth, asyncRoute(async (req, res) => {
        const [settings, ...lists] = await Promise.all([
            getSettings(req.userId),
            ...DATA_COLLECTIONS.map(c => store.find(c, { userId: req.userId })),
        ])
        const out = { settings }
        DATA_COLLECTIONS.forEach((c, i) => {
            out[c] = lists[i].map(({ userId, ...d }) => d)
        })
        res.json(out)
    }))

    api.put("/settings", requireAuth, asyncRoute(async (req, res) => {
        const patch = sanitizeSettings(req.body || {})
        const saved = await store.updateOne("settings", { userId: req.userId }, patch, { upsert: true })
        const { userId, ...rest } = saved
        res.json(rest)
    }))

    // Replace all of a user's data with a backup file.
    api.post("/restore", requireAuth, asyncRoute(async (req, res) => {
        const body = req.body || {}
        for (const col of DATA_COLLECTIONS) {
            if (!Array.isArray(body[col])) continue
            await store.deleteMany(col, { userId: req.userId })
            const docs = body[col].slice(0, 50000).map(d => ({
                ...sanitize(col, d),
                id: typeof d.id === "string" && d.id ? d.id.slice(0, 40) : crypto.randomUUID(),
                userId: req.userId,
                createdAt: d.createdAt || new Date().toISOString(),
            }))
            await store.insertMany(col, docs)
        }
        if (body.settings) {
            await store.updateOne("settings", { userId: req.userId }, sanitizeSettings(body.settings), { upsert: true })
        }
        res.json({ ok: true })
    }))

    // ---- Apple Shortcuts ----
    const requireApiKey = asyncRoute(async (req, res, next) => {
        const header = req.headers.authorization || ""
        const key = (header.startsWith("Bearer ") ? header.slice(7) : req.headers["x-api-key"] || "").trim()
        if (!key.startsWith(API_KEY_PREFIX)) return res.status(401).json({ error: "Missing API key", message: "Missing API key - check the Authorization header in your shortcut." })
        const user = await store.findOne("users", { apiKeyHash: hashKey(key) })
        if (!user) return res.status(401).json({ error: "Invalid API key", message: "That API key isn’t valid - generate a new one in Ledger’s Settings." })
        req.userId = user.id
        next()
    })

    // Lists for "Choose from List" actions in a shortcut.
    api.get("/shortcut/options", requireApiKey, asyncRoute(async (req, res) => {
        const s = await getSettings(req.userId)
        res.json({
            expense: (s.categories?.expense || []).map(c => c.name),
            income: (s.categories?.income || []).map(c => c.name),
            accounts: (s.accounts || []).map(a => a.name),
        })
    }))

    api.post("/shortcut/transaction", requireApiKey, asyncRoute(async (req, res) => {
        const body = req.body || {}
        const s = await getSettings(req.userId)
        const type = /^inc/i.test(String(body.type || "")) ? "income" : "expense"
        const amount = Math.abs(parseFloat(String(body.amount ?? "").replace(/[^0-9.-]/g, "")))
        if (!(amount > 0)) return res.status(400).json({ error: "Invalid amount", message: "Enter an amount greater than $0." })

        const categories = s.categories?.[type] || []
        const wanted = String(body.category || "").trim().toLowerCase()
        const category = categories.find(c => c.name.toLowerCase() === wanted)?.name
            || categories.find(c => c.name.toLowerCase() === "other")?.name
            || categories[0]?.name
            || "Other"

        const accounts = s.accounts || []
        const wantedAccount = String(body.account || "").trim().toLowerCase()
        const defaultId = s.preferences?.[type === "income" ? "defaultIncomeAccount" : "defaultExpenseAccount"]
        const account = accounts.find(a => a.name.toLowerCase() === wantedAccount)?.name
            || accounts.find(a => a.id === defaultId)?.name
            || ""

        const title = String(body.title || body.description || "").trim() || category
        // Accept 2026-09-27 or 27/09/2026 (Shortcuts' default short date); otherwise use today.
        const rawDate = String(body.date || "").trim()
        const dm = rawDate.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
        const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
            ? rawDate
            : dm ? `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}` : todayIn(DEFAULT_TZ)
        const doc = {
            ...sanitize("transactions", { type, amount, title, category, account, note: body.note, date }),
            id: crypto.randomUUID(),
            userId: req.userId,
            createdAt: new Date().toISOString(),
        }
        await store.insertMany("transactions", [doc])
        const { userId, ...transaction } = doc
        const fmt = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount)
        res.json({
            ok: true,
            message: `${type === "income" ? "Income" : "Expense"} saved: ${fmt} ${title} (${category})`,
            transaction,
        })
    }))

    const checkCollection = (req, res, next) =>
        DATA_COLLECTIONS.includes(req.params.col) ? next() : res.status(404).json({ error: "Unknown collection" })

    api.post("/:col/bulk", requireAuth, checkCollection, asyncRoute(async (req, res) => {
        const items = Array.isArray(req.body) ? req.body.slice(0, 5000) : []
        const now = new Date().toISOString()
        const docs = items.map((item, i) => ({
            ...sanitize(req.params.col, item),
            id: crypto.randomUUID(),
            userId: req.userId,
            createdAt: new Date(Date.parse(now) + i).toISOString(),
        }))
        await store.insertMany(req.params.col, docs)
        res.json(docs.map(({ userId, ...d }) => d))
    }))

    api.post("/:col", requireAuth, checkCollection, asyncRoute(async (req, res) => {
        const doc = {
            ...sanitize(req.params.col, req.body || {}),
            id: crypto.randomUUID(),
            userId: req.userId,
            createdAt: new Date().toISOString(),
        }
        await store.insertMany(req.params.col, [doc])
        const { userId, ...out } = doc
        res.json(out)
    }))

    api.put("/:col/:id", requireAuth, checkCollection, asyncRoute(async (req, res) => {
        const patch = sanitize(req.params.col, req.body || {}, { partial: true })
        const saved = await store.updateOne(req.params.col, { userId: req.userId, id: req.params.id }, patch)
        if (!saved) return res.status(404).json({ error: "Not found" })
        const { userId, ...out } = saved
        res.json(out)
    }))

    api.delete("/:col/:id", requireAuth, checkCollection, asyncRoute(async (req, res) => {
        await store.deleteMany(req.params.col, { userId: req.userId, id: req.params.id })
        res.json({ ok: true })
    }))

    // ---- Market data ----
    api.get("/market/quotes", requireAuth, asyncRoute(async (req, res) => {
        res.json(await getQuotes(parseSymbols(req.query.symbols)))
    }))

    api.get("/market/history", requireAuth, asyncRoute(async (req, res) => {
        res.json(await getHistory(parseSymbols(req.query.symbols), String(req.query.range || "1y")))
    }))

    app.use("/api", api)
    app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }))

    // Serve the built frontend in production.
    const dist = path.join(__dirname, "..", "dist")
    if (fs.existsSync(dist)) {
        app.use(express.static(dist, { index: false, maxAge: "1h" }))
        app.get(/.*/, (req, res) => res.sendFile(path.join(dist, "index.html")))
    }

    app.use((err, req, res, next) => {
        console.error(err)
        res.status(500).json({ error: "Something went wrong on the server" })
    })

    app.listen(PORT, () => console.log(`Finance Tracker API on http://localhost:${PORT} (storage: ${store.kind})`))
}

main().catch(err => {
    console.error("Failed to start server:", err)
    process.exit(1)
})
