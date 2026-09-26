const { randomUUID } = require("crypto")

const SCHEMA_VERSION = 2

// Brings settings saved by older versions up to date. Returns a patch, or null if nothing changed.
function upgradeSettings(s) {
    if ((s.schemaVersion || 1) >= SCHEMA_VERSION) return null
    const patch = { schemaVersion: SCHEMA_VERSION }
    const expense = s.categories?.expense || []
    if (!expense.some(c => c.excluded)) {
        const existing = expense.find(c => /^invest/i.test(c.name))
        const next = existing
            ? expense.map(c => (c === existing ? { ...c, excluded: true } : c))
            : [...expense.filter(c => c.name !== "Other"), { name: "Investing", icon: "trend", excluded: true }, ...expense.filter(c => c.name === "Other")]
        patch.categories = { ...s.categories, expense: next }
    }
    return patch
}

function defaultSettings() {
    return {
        accounts: [
            { id: randomUUID(), name: "Everyday Account", type: "bank", balance: 0, limit: 0 },
            { id: randomUUID(), name: "Savings Account", type: "bank", balance: 0, limit: 0 },
            { id: randomUUID(), name: "Credit Card", type: "credit", balance: 0, limit: 0 },
        ],
        categories: {
            expense: [
                { name: "Food", icon: "food" },
                { name: "Groceries", icon: "cart" },
                { name: "Going Out", icon: "drink" },
                { name: "Shopping", icon: "bag" },
                { name: "Transport", icon: "car" },
                { name: "Subscriptions", icon: "repeat" },
                { name: "Bills", icon: "bolt" },
                { name: "Health", icon: "heart" },
                { name: "Travel", icon: "plane" },
                { name: "Gifts", icon: "gift" },
                { name: "Education", icon: "book" },
                { name: "Investing", icon: "trend", excluded: true },
                { name: "Other", icon: "dots" },
            ],
            income: [
                { name: "Salary", icon: "briefcase" },
                { name: "Youth Allowance", icon: "bank" },
                { name: "Investment Income", icon: "trend" },
                { name: "Refund", icon: "refund" },
                { name: "Gifts", icon: "gift" },
                { name: "Other", icon: "dots" },
            ],
        },
        prices: {},
        preferences: { convertForeign: true, baseCurrency: "AUD", defaultExpenseAccount: "", defaultIncomeAccount: "" },
        schemaVersion: SCHEMA_VERSION,
    }
}

module.exports = { defaultSettings, upgradeSettings }
