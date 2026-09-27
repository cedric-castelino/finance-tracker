// Storage layer. Uses MongoDB when ATLAS_URI is set, otherwise falls back to a
// local JSON file (server/data/db.json) so the app runs with zero setup.
const fs = require("fs")
const path = require("path")

const { schemas } = require("./schemas.cjs")

// Every data collection is defined by its schema, so new ones are picked up automatically.
const COLLECTIONS = ["users", ...Object.keys(schemas), "settings"]

function createFileStore(file) {
    let data = {}
    if (fs.existsSync(file)) {
        data = JSON.parse(fs.readFileSync(file, "utf8"))
    }
    for (const c of COLLECTIONS) data[c] = data[c] || []

    let writeTimer = null
    const persist = () => {
        clearTimeout(writeTimer)
        writeTimer = setTimeout(() => {
            fs.mkdirSync(path.dirname(file), { recursive: true })
            const tmp = file + ".tmp"
            fs.writeFileSync(tmp, JSON.stringify(data))
            fs.renameSync(tmp, file)
        }, 50)
    }
    const matches = (doc, filter) => Object.entries(filter).every(([k, v]) => doc[k] === v)

    return {
        kind: "file",
        async find(col, filter) {
            return data[col].filter(d => matches(d, filter)).map(d => ({ ...d }))
        },
        async findOne(col, filter) {
            const doc = data[col].find(d => matches(d, filter))
            return doc ? { ...doc } : null
        },
        async insertMany(col, docs) {
            data[col].push(...docs.map(d => ({ ...d })))
            persist()
            return docs
        },
        async updateOne(col, filter, patch, { upsert = false } = {}) {
            const doc = data[col].find(d => matches(d, filter))
            if (doc) {
                Object.assign(doc, patch)
                persist()
                return { ...doc }
            }
            if (upsert) {
                const created = { ...filter, ...patch }
                data[col].push(created)
                persist()
                return { ...created }
            }
            return null
        },
        async deleteMany(col, filter) {
            const before = data[col].length
            data[col] = data[col].filter(d => !matches(d, filter))
            persist()
            return before - data[col].length
        },
    }
}

function createMongoStore(uri, dbName) {
    const { MongoClient, ServerApiVersion } = require("mongodb")
    const client = new MongoClient(uri, {
        serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
    })
    const db = client.db(dbName)
    const strip = doc => {
        if (!doc) return null
        const { _id, ...rest } = doc
        return rest
    }

    return {
        kind: "mongo",
        async init() {
            await client.connect()
            await Promise.all([
                db.collection("users").createIndex({ email: 1 }, { unique: true }),
                db.collection("users").createIndex({ id: 1 }, { unique: true }),
                db.collection("users").createIndex({ apiKeyHash: 1 }),
                ...COLLECTIONS.filter(c => c !== "users").map(c => db.collection(c).createIndex({ userId: 1, id: 1 })),
            ])
        },
        async find(col, filter) {
            return (await db.collection(col).find(filter).toArray()).map(strip)
        },
        async findOne(col, filter) {
            return strip(await db.collection(col).findOne(filter))
        },
        async insertMany(col, docs) {
            if (docs.length) await db.collection(col).insertMany(docs.map(d => ({ ...d })))
            return docs
        },
        async updateOne(col, filter, patch, { upsert = false } = {}) {
            const res = await db.collection(col).findOneAndUpdate(
                filter,
                { $set: patch },
                { upsert, returnDocument: "after" }
            )
            return strip(res)
        },
        async deleteMany(col, filter) {
            const res = await db.collection(col).deleteMany(filter)
            return res.deletedCount
        },
    }
}

async function createStore() {
    const uri = process.env.ATLAS_URI || process.env.MONGODB_URI
    if (!uri && process.env.NODE_ENV === "production") {
        throw new Error("ATLAS_URI must be set in production - the local file store would be wiped on each deploy.")
    }
    const store = uri
        ? createMongoStore(uri, process.env.DB_NAME || "FinanceTracker")
        : createFileStore(process.env.DATA_FILE || path.join(__dirname, "data", "db.json"))
    if (store.init) await store.init()
    return store
}

module.exports = { createStore }
