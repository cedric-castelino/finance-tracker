const { randomUUID } = require("crypto")

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
        preferences: { convertForeign: true, baseCurrency: "AUD" },
    }
}

module.exports = { defaultSettings }
