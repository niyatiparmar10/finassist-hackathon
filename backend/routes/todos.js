// backend/routes/todos.js
// SECTION 6: Personal To-Do List API
// Lets users track: pay someone, collect money, reminders, etc.

const express = require("express");
const router = express.Router();
const { TodoItem } = require("../models");

// ── DEBUG helper ──────────────────────────────────────────────────────────────
function dbg(label, data) {
  console.log(`[TODOS] ${label}:`, JSON.stringify(data, null, 2));
}

// POST /api/todos/add
// Create a new todo item
router.post("/add", async (req, res) => {
  try {
    const { userId, text, type, amount, person } = req.body;
    dbg("POST /add", { userId, text, type });

    if (!userId || !text) {
      console.warn("[TODOS] Missing userId or text");
      return res.status(400).json({ error: "userId and text are required" });
    }

    const todo = await TodoItem.create({
      userId,
      text: text.trim(),
      type: type || "other",
      amount: amount ? parseFloat(amount) : null,
      person: person ? person.trim() : "",
      completed: false,
    });

    dbg("Todo created", todo._id);
    res.json({ success: true, todo });
  } catch (err) {
    console.error("[TODOS] POST /add error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/todos/:userId
// Get all todos for a user (incomplete first, then completed, both by newest)
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    dbg("GET /:userId", userId);

    const todos = await TodoItem.find({ userId }).sort({
      completed: 1, // incomplete first
      createdAt: -1, // newest first within each group
    });

    dbg("Todos fetched", { count: todos.length });
    res.json({ todos });
  } catch (err) {
    console.error("[TODOS] GET /:userId error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/todos/toggle/:id
// Toggle completed state
router.put("/toggle/:id", async (req, res) => {
  try {
    const { id } = req.params;
    dbg("PUT /toggle/:id", id);

    const todo = await TodoItem.findById(id);
    if (!todo) {
      console.warn("[TODOS] Todo not found:", id);
      return res.status(404).json({ error: "Todo not found" });
    }

    todo.completed = !todo.completed;
    todo.updatedAt = new Date();
    await todo.save();

    dbg("Todo toggled", { id, completed: todo.completed });
    res.json({ success: true, todo });
  } catch (err) {
    console.error("[TODOS] PUT /toggle error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/todos/edit/:id
// Edit text, type, amount, or person of a todo
router.put("/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { text, type, amount, person } = req.body;
    dbg("PUT /edit/:id", { id, text, type });

    const updateFields = { updatedAt: new Date() };
    if (text !== undefined) updateFields.text = text.trim();
    if (type !== undefined) updateFields.type = type;
    if (amount !== undefined)
      updateFields.amount = amount ? parseFloat(amount) : null;
    if (person !== undefined) updateFields.person = person ? person.trim() : "";

    const updated = await TodoItem.findByIdAndUpdate(id, updateFields, {
      new: true,
    });
    if (!updated) {
      console.warn("[TODOS] Todo not found for edit:", id);
      return res.status(404).json({ error: "Todo not found" });
    }

    dbg("Todo edited", updated._id);
    res.json({ success: true, todo: updated });
  } catch (err) {
    console.error("[TODOS] PUT /edit error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/todos/:id
// Delete a todo item
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    dbg("DELETE /:id", id);

    const deleted = await TodoItem.findByIdAndDelete(id);
    if (!deleted) {
      console.warn("[TODOS] Todo not found for delete:", id);
      return res.status(404).json({ error: "Todo not found" });
    }

    dbg("Todo deleted", id);
    res.json({ success: true, deletedId: id });
  } catch (err) {
    console.error("[TODOS] DELETE /:id error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/todos/clear-completed/:userId
// Delete all completed todos for a user
router.delete("/clear-completed/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    dbg("DELETE /clear-completed/:userId", userId);

    const result = await TodoItem.deleteMany({ userId, completed: true });
    dbg("Completed todos cleared", { deleted: result.deletedCount });

    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    console.error("[TODOS] DELETE /clear-completed error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
