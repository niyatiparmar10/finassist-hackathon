require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/expenses", require("./routes/expenses"));
app.use("/api/savings", require("./routes/savings"));
app.use("/api/goals", require("./routes/goals"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/chatbot", require("./routes/chatbot"));
app.use("/api/insights", require("./routes/insights"));
app.use("/api/user", require("./routes/user"));

app.get("/", (req, res) => res.json({ status: "FinMind AI backend running" }));

// Connect to MongoDB then start server
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT || 3001, () => {
      console.log(`Backend running on port ${process.env.PORT || 3001}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });
