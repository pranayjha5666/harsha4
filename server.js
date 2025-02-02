require("dotenv").config(); // Must be at the top
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const bodyParser = require("body-parser");
const app = express();
app.use(express.json());
app.use(cors());
// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.url}`);
//   next();
// });

app.use(bodyParser.json());
// Connect to MongoDB
// Basic route for testing
app.get("/", (req, res) => {
  res.send("Server is running");
});
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || "mongodb+srv://bt22cse016:igbackend2025@igbackend.m3vrs.mongodb.net/test?retryWrites=true&w=majority";

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,

    });

    console.log("✅ MongoDB connected successfully");

    // Handle connection errors after initial connection
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Attempting to reconnect...');
    });

  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

// Connect to MongoDB
connectDB();



const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, but log the error
});

module.exports = app;