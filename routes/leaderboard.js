const express = require("express");
const router = express.Router();
const Player = require("../models/Player");

// Get leaderboard
router.get("/", async (req, res) => {
  try {
    const players = await Player.find().sort({ score: -1 });
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update or add player score
router.post("/update-score", async (req, res) => {
  const { name, score } = req.body;

  try {
    let player = await Player.findOne({ name });

    if (player) {
      player.score = score;
    } else {
      player = new Player({ name, score });
    }

    await player.save();
    res.json({ message: "Score updated", player });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
