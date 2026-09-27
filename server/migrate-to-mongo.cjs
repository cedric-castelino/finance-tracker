// Copies everything from the local JSON store (server/data/db.json) into MongoDB.
// Usage: set ATLAS_URI in .env or config.env, then run `npm run migrate:mongo [path/to/db.json]`.
// Safe to re-run: users whose email already exists in MongoDB are skipped.
require("dotenv").config({ path: require("path").join(__dirname, "..", "config.env") })
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") })

const fs = require("fs")
const path = require("path")
const { MongoClient, ServerApiVersion } = require("mongodb")

const { schemas } = require("./schemas.cjs")

const COLLECTIONS = [...Object.keys(schemas), "settings"]

async function main() {
    const uri = process.env.ATLAS_URI || process.env.MONGODB_URI
    if (!uri) throw new Error("ATLAS_URI is not set. Add it to .env or config.env first.")
    const file = process.argv[2] || process.env.DATA_FILE || path.join(__dirname, "data", "db.json")
    if (!fs.existsSync(file)) throw new Error(`No local data found at ${file}`)
    const data = JSON.parse(fs.readFileSync(file, "utf8"))

    const client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true } })
    await client.connect()
    const db = client.db(process.env.DB_NAME || "FinanceTracker")
    try {
        for (const user of data.users || []) {
            if (await db.collection("users").findOne({ email: user.email })) {
                console.log(`- ${user.email}: already in MongoDB, skipped`)
                continue
            }
            await db.collection("users").insertOne({ ...user })
            const counts = []
            for (const col of COLLECTIONS) {
                const docs = (data[col] || []).filter(d => d.userId === user.id).map(d => ({ ...d }))
                if (docs.length) await db.collection(col).insertMany(docs)
                counts.push(`${docs.length} ${col}`)
            }
            console.log(`✓ ${user.email}: ${counts.join(", ")}`)
        }
    } finally {
        await client.close()
    }
    console.log("Done. Restart the server - it will now use MongoDB.")
}

main().catch(err => {
    console.error(err.message)
    process.exit(1)
})
