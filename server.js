require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./config/db");

const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => res.send("Military Leave System API Running"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.use("/auth", require("./routes/auth"));
app.use("/leave", require("./routes/leave"));
