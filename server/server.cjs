const connect = require("./connect.cjs");
const express = require("express");
const cors = require("cors");
const users = require("./userRoutes.cjs")

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())
app.use(users)

app.listen(PORT, () => {
    connect.connectToServer()
    console.log(`server is running on port ${PORT}`)
})