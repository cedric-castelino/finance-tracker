// Repeat transactions (subscriptions, pay, rent...). Occurrences are always computed from the
// start date so monthly items don't drift (e.g. the 31st becomes the 30th, then back to the 31st).
const crypto = require("crypto")

const pad = n => String(n).padStart(2, "0")
const parse = iso => { const [y, m, d] = iso.split("-").map(Number); return { y, m, d } }
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate()

function addDays(date, n) {
    const { y, m, d } = parse(date)
    const t = new Date(Date.UTC(y, m - 1, d + n))
    return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())
}

function addMonths(date, n) {
    const { y, m, d } = parse(date)
    const total = y * 12 + (m - 1) + n
    const ny = Math.floor(total / 12)
    const nm = (total % 12) + 1
    return iso(ny, nm, Math.min(d, daysInMonth(ny, nm)))
}

function occurrence(start, frequency, n) {
    switch (frequency) {
        case "daily": return addDays(start, n)
        case "weekly": return addDays(start, 7 * n)
        case "fortnightly": return addDays(start, 14 * n)
        case "yearly": return addMonths(start, 12 * n)
        default: return addMonths(start, n)
    }
}

// First scheduled date strictly after `after` ("" = from the start).
function nextOccurrence(r, after = r.lastDate || "") {
    for (let n = 0; n < 50000; n++) {
        const date = occurrence(r.startDate, r.frequency, n)
        if (date > after) return date
    }
    return null
}

const running = new Map()

// Creates any transactions that have fallen due up to `today`. Safe to call on every data load.
function processRecurring(store, userId, today) {
    if (running.has(userId)) return running.get(userId)
    const job = (async () => {
        const items = await store.find("recurring", { userId })
        let created = 0
        for (const r of items) {
            if (!r.active || !r.startDate || !(r.amount > 0)) continue
            const due = []
            let next = nextOccurrence(r)
            while (next && next <= today && (!r.endDate || next <= r.endDate) && due.length < 1000) {
                due.push(next)
                next = nextOccurrence(r, next)
            }
            if (!due.length) continue
            const now = Date.now()
            await store.insertMany("transactions", due.map((date, i) => ({
                type: r.type,
                amount: r.amount,
                title: r.title,
                category: r.category,
                account: r.account || "",
                date,
                note: "",
                recurringId: r.id,
                id: crypto.randomUUID(),
                userId,
                createdAt: new Date(now + i).toISOString(),
            })))
            await store.updateOne("recurring", { userId, id: r.id }, { lastDate: due[due.length - 1] })
            created += due.length
        }
        return created
    })()
    running.set(userId, job)
    return job.finally(() => running.delete(userId))
}

module.exports = { processRecurring, nextOccurrence }
