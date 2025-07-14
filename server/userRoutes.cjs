const express = require("express")
const database = require("./connect.cjs")
const ObjectId = require("mongodb").ObjectId

let userRoutes = express.Router()

// Return all Users
userRoutes.route("/users").get(async (request, response) => {
    let db = database.getDb()
    let data = await db.collection("Data").find({}).toArray()
    if (data.length > 0) {
        response.json(data)
    } else {
        throw new Error("Data was not found")
    }
})

// Return one user based on their ID
userRoutes.route("/users/:id").get(async (request, response) => {
    let db = database.getDb()
    let data = await db.collection("Data").findOne({_id: new ObjectId(request.params.id)})
    if (Object.keys(data).length > 0) {
        response.json(data) 
    } else {
        throw new Error("Data was not found")
    }
})

// Return a users transactions
userRoutes.route("/transactions/:id").get(async (request, response) => {
    let db = database.getDb()
    let data = await db.collection("Data").findOne(
        { _id: new ObjectId(request.params.id) },
        { projection: { transactions: 1, _id: 0 } }
    );
    if (Object.keys(data).length > 0) {
        response.json(data)
    } else {
        throw new Error("Data was not found")
    }
});

// Return a users sources
userRoutes.route("/sources/:id").get(async (request, response) => {
    let db = database.getDb()
    let data = await db.collection("Data").findOne(
        { _id: new ObjectId(request.params.id) },
        { projection: { sources: 1, _id: 0 } }
    );
    if (Object.keys(data).length > 0) {
        response.json(data)
    } else {
        throw new Error("Data was not found")
    }
});

// Add a new User
userRoutes.route("/register").post(async (request, response) => {
    let db = database.getDb()
    let mongoObject = {
        email: request.body.email, 
        firstName: request.body.firstName, 
        lastName: request.body.lastName, 
        password: request.body.password, 
        transactions: request.body.transactions,
        firstTimeSetup: request.body.firstTimeSetup,
        sources: request.body.sources
    }

    const existingUser = await db.collection("Data").findOne({ email: request.body.email });

    if (existingUser) {
        response.status(400).json({ error: "Email already in use" });
    } else {
        data = await db.collection("Data").insertOne(mongoObject)
        response.json(data)
    }
})

// Login a User
userRoutes.route("/login").post(async (request, response) => {
    let db = database.getDb();
    const { email, password } = request.body;

    try {
        const user = await db.collection("Data").findOne({ email: email });
        if (!user) {
            return response.status(400).json({ error: "User not found" });
        }
        if (user.password !== password) {
            return response.status(400).json({ error: "Incorrect password" });
        }
        const { password: _, ...userWithoutPassword } = user;
        response.json({ message: "Login successful", user: userWithoutPassword });
    } catch (error) {
        response.status(400).json({ error: "Internal server error" });
    }
});

// Update an existing user
userRoutes.route("/users/:id").put(async (request, response) => {
    let db = database.getDb()
    let mongoObject = {
        $set: {
            email: request.body.email, 
            firstName: request.body.firstName, 
            lastName: request.body.lastName, 
            password: request.body.password, 
            transactions: request.body.transactions,
            firstTimeSetup: request.body.firstTimeSetup,
            sources: request.body.sources
        }
    }
    let data = await db.collection("Data").updateOne({_id: new ObjectId(request.params.id)}, mongoObject)
    response.json(data)
})

// Update a users sources
userRoutes.route("/users/sources/:id").put(async (request, response) => {
    let db = database.getDb();
    let mongoObject = {
        $set: {
            firstTimeSetup: request.body.firstTimeSetup,
            sources: request.body.sources 
        }
    };
    let data = await db.collection("Data").updateOne({_id: new ObjectId(request.params.id)}, mongoObject)
    response.json(data);
});

// Update the balance of a specific source by title
userRoutes.route("/users/sources/:id/balance").put(async (request, response) => {
    let db = database.getDb();
    const userId = request.params.id;
    const { title, newBalance } = request.body;

    try {
        const result = await db.collection("Data").updateOne(
            { _id: new ObjectId(userId), "sources.title": title },
            { $set: { "sources.$.balance": newBalance } }
        );

        if (result.matchedCount === 0) {
            return response.status(404).json({ message: "Source not found for the given user." });
        }

        response.json({ message: "Balance updated successfully.", result });
    } catch (error) {
        console.error("Error updating balance:", error);
        response.status(500).json({ message: "Internal server error." });
    }
});

// Append a new transaction
userRoutes.route("/users/transactions/:id").put(async (request, response) => {
    let db = database.getDb();

    const transactionWithId = {
        ...request.body.transaction,
        _id: new ObjectId()
    };

    let mongoObject = {
        $push: {
            transactions: transactionWithId 
        }
    };
    let data = await db.collection("Data").updateOne({_id: new ObjectId(request.params.id)}, mongoObject)
    response.json(data);
});

// Delete a user
userRoutes.route("/users/:id").delete(async (request, response) => {
    let db = database.getDb()
    let data = await db.collection("Data").deleteOne({_id: new ObjectId(request.params.id)})
    response.json(data)
})

// Delete a transaction
userRoutes.route("/users/transactions/:userId/:transactionId").delete(async (request, response) => {
    const db = database.getDb();
    const { userId, transactionId } = request.params;
    const result = await db.collection("Data").updateOne(
        { _id: new ObjectId(userId) },
        {
            $pull: {
                transactions: { _id: new ObjectId(transactionId) }
            }
        }
    );
    response.json(result);
});

module.exports = userRoutes