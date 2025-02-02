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



// Configure Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "picoftheday",
        allowed_formats: ["jpg", "jpeg", "png"]
    },
});

const upload = multer({ storage });

// Schema for "Pic of the Day"
const picSchema = new mongoose.Schema({
    imageUrl: String,
    department: String,
    date: String,
    likes: { type: Number, default: 0 },
    isliked : Boolean,
});

const Pic = mongoose.model("Pic", picSchema);

// Endpoint to upload an image
app.post("/upload-pic", upload.single("image"), async (req, res) => {
    try {
        const { department, date } = req.body;
        const newPic = new Pic({
            imageUrl: req.file.path,
            department,
            date,
            likes: 0,
            isliked:false
        });

        await newPic.save();
        res.status(201).json({ message: "Image uploaded successfully!", pic: newPic });
    } catch (error) {
        res.status(500).json({ error: "Error uploading image" });
    }
});

app.get("/get-pics/:date?", async (req, res) => {
  try {
      const { date } = req.params;
      
      let filter = {}; // Default filter to fetch all images
      
      // If date is provided, filter by the given date
      if (date) {
          filter.date = date;
      }

      const pics = await Pic.find(filter).sort({ date: -1 });
      res.json(pics);
  } catch (error) {
      res.status(500).json({ error: "Error fetching images" });
  }
});


// Endpoint to like an image


app.post("/like-pic", async (req, res) => {
  const { id } = req.body;
  try {
      const updatedPic = await Pic.findByIdAndUpdate(id, { 
          $inc: { likes: 1 }, 
          
      }, { new: true });
      res.json({ message: "Image liked!", updatedPic });
  } catch (error) {
      res.status(500).json({ error: "Error liking image" });
  }
});

app.post("/dislike-pic", async (req, res) => {
  const { id } = req.body;
  try {
      const updatedPic = await Pic.findByIdAndUpdate(id, { 
          $inc: { likes: -1 }, 
        
      }, { new: true });
      res.json({ message: "Image disliked!", updatedPic });
  } catch (error) {
      res.status(500).json({ error: "Error disliking image" });
  }
});


// Endpoint to delete an image and its associated data
app.delete("/delete-pic/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Find the image to be deleted
    const picToDelete = await Pic.findById(id);

    if (!picToDelete) {
      return res.status(404).json({ error: "Image not found" });
    }

    // Delete the image from Cloudinary
    const publicId = picToDelete.imageUrl.split("/").pop().split(".")[0];  // Extract the publicId from URL
    await cloudinary.uploader.destroy(publicId);

    // Delete the image record from MongoDB
    await Pic.findByIdAndDelete(id);

    

    res.json({ message: "Image and related data deleted successfully!" });
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).json({ error: "Error deleting image" });
  }
});


// Define Schema for Departments
const departmentSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  score: { type: Number, default: 0 },
});

const Department = mongoose.model("Department", departmentSchema);


// Initialize departments with zero scores
const initializeDepartments = async () => {
  const departments = [
    "CSE",
    "ECE",
    "EEE",
    "MECH",
    "META",
    "CHEMMIN", // Renamed from "MIN" to match Flutter model
    "ARCHI",
    "CIVIL",
  ];

  for (const dept of departments) {
    await Department.updateOne(
      { name: dept },
      { $setOnInsert: { name: dept, score: 0 } },
      { upsert: true }
    );
  }
  console.log("Departments initialized");
};

initializeDepartments();

// Fetch leaderboard (sorted by score)
app.get("/leaderboard", async (req, res) => {
  try {
    const departments = await Department.find().sort({ score: -1 });
    
    // Convert to Flutter model format
    const points = {};
    departments.forEach((dept) => {
      points[dept.name] = dept.score;
    });

    res.json({
      message: "Leaderboard fetched successfully",
      status: true,
      points,
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching leaderboard" });
  }
});

// Update department score
app.post("/update-score", async (req, res) => {
  const { name, score } = req.body;
  if (!name || score === undefined) {
    return res.status(400).json({ status: false, error: "Invalid data" });
  }

  try {
    const updated = await Department.findOneAndUpdate(
      { name },
      { score },
      { new: true }
    );

    if (updated) {
      res.json({
        message: "Score updated successfully!",
        status: true, // ✅ Ensure status is included
        updated
      });
    } else {
      res.status(404).json({ status: false, error: "Department not found" });
    }
  } catch (error) {
    res.status(500).json({ status: false, error: "Error updating score" });
  }
});



// Define Schema for Enthusiasm Points
const enthusiasmSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  enthusiasmPoints: { type: Number, default: 0 },
});

const Enthuboards = mongoose.model("Enthuboards", enthusiasmSchema);

// Initialize Enthuboards with zero enthusiasm points
const initializeEnthuboards = async () => {
  const departments = [
    "CSE",
    "ECE",
    "EEE",
    "MECH",
    "CIVIL",
    "CHEMMIN", // Updated to match Flutter model
    "META",
    "ARCHI",
  ];

  for (const dept of departments) {
    await Enthuboards.updateOne(
      { name: dept },
      { $setOnInsert: { name: dept, enthusiasmPoints: 0 } },
      { upsert: true }
    );
  }
  console.log("Enthuboards initialized");
};

initializeEnthuboards();

// Fetch Enthuboards (sorted by enthusiasm points)
app.get("/enthuboards", async (req, res) => {
  try {
    const departments = await Enthuboards.find().sort({ enthusiasmPoints: -1 });

    // Convert to Flutter-friendly format
    const points = {};
    departments.forEach((dept) => {
      points[dept.name] = dept.enthusiasmPoints;
    });

    res.json({
      message: "Enthuboards fetched successfully",
      status: true,
      points,
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching enthuboards" });
  }
});

// Update department's enthusiasm points
app.post("/update-enthusiasm", async (req, res) => {
  const { name, enthusiasmPoints } = req.body;
  if (!name || enthusiasmPoints === undefined) {
    return res.status(400).json({ error: "Invalid data" });
  }

  try {
    const updated = await Enthuboards.findOneAndUpdate(
      { name },
      { enthusiasmPoints },
      { new: true }
    );
    if (updated) {
      res.json({
        message: "Enthusiasm points updated successfully!",
        status: true,
        points: { [updated.name]: updated.enthusiasmPoints },
      });
    } else {
      res.status(404).json({ error: "Department not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error updating enthusiasm points" });
  }
});

const articleSchema = new mongoose.Schema({
  department: { type: String, required: true },
  data: { type: String, required: true },
  timeAtCreate: { type: Date, default: Date.now },
  articleDate: { type: Date, required: true }  // Add articleDate to store date explicitly
});

const Article = mongoose.model("Article", articleSchema);

app.get("/fetch_articles/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const startDate = new Date(date + "T00:00:00.000Z");
    const endDate = new Date(date + "T23:59:59.999Z");

    const articles = await Article.find({
      articleDate: { $gte: startDate, $lte: endDate },  // Use articleDate for filtering
    });

    const formattedArticles = articles.map((article) => ({
      _id: article._id,
      Data: article.data,
      Department: article.department,
      timeAtCreate: article.timeAtCreate,
      __v: article.__v,
    }));

    res.json({
      message: "Articles fetched successfully",
      status: true,
      articles: formattedArticles,
    });
  } catch (err) {
    console.error("Error fetching articles:", err);
    res.status(500).json({ message: "Server Error", status: false });
  }
});

app.post("/create_articles", async (req, res) => {
  const { department, data, articleDate } = req.body;

  try {
    const newArticle = new Article({
      department,
      data,
      articleDate: new Date(articleDate),  // Make sure articleDate is properly saved
    });

    await newArticle.save();
    res.status(201).json({
      message: "Article created successfully",
      status: true,
      article: {
        _id: newArticle._id,
        Data: newArticle.data,
        Department: newArticle.department,
        timeAtCreate: newArticle.timeAtCreate,
        __v: newArticle.__v,
      },
    });
  } catch (err) {
    console.error("Error creating article:", err);
    res.status(500).json({ message: "Server Error", status: false });
  }
});

app.delete("/delete-schedule/:id", async (req, res) => {
  const { id } = req.params;
  try {
      const schedule = await Schedules.findByIdAndDelete(id);
      if (!schedule) {
          return res.status(404).json({ error: "Schedule not found" });
      }
      res.json({ message: "Schedule deleted successfully!" });
  } catch (error) {
      res.status(500).json({ error: "Error deleting schedule" });
  }
});

app.delete("/delete-article/:id", async (req, res) => {
  const { id } = req.params;
  try {
      const article = await Article.findByIdAndDelete(id);
      if (!article) {
          return res.status(404).json({ error: "Article not found" });
      }
      res.json({ message: "Article deleted successfully!" });
  } catch (error) {
      res.status(500).json({ error: "Error deleting article" });
  }
});




// Define the Schedules model (Schema)
const scheduleSchema = new mongoose.Schema({
  Team1: String,
  Team2: String,
  Venue: String,
  GameName: String,
  Winner: String,
  Date: String,
  Time: String,
  timeAtCreate: { type: Date, default: Date.now },
});

const Schedules = mongoose.model("Schedules", scheduleSchema);

// Endpoint to create a new schedule
app.post("/create-schedule", async (req, res) => {
  const { Team1, Team2, Venue, GameName, Winner, Date, Time } = req.body;

  const newSchedule = new Schedules({
    Team1,
    Team2,
    Venue,
    GameName,
    Winner,
    Date,
    Time,
  });

  try {
    await newSchedule.save();
    res.status(201).send({ message: "Schedule created successfully", status: true, schedule: newSchedule });
  } catch (error) {
    console.error("Error creating schedule:", error);
    res.status(500).send({ message: "Error creating schedule", status: false });
  }
});

// Endpoint to fetch schedules by date and Team1 (team1 passed as a parameter)
app.get("/fetch-schedules/:date/:team1?", async (req, res) => {
  console.log("Endpoint hit with params:", req.params); // Debug log
  const { date, team1 } = req.params;

  // Validate date parameter
  if (!date) {
    return res.status(400).send({
      message: "Date parameter is required",
      status: false
    });
  }

  try {
    const query = { Date: date };
    
    // Only add team filter if team1 is provided and not empty
    if (team1 && team1.trim() !== "") {
      query.$or = [
        { Team1: { $regex: new RegExp(`^${team1}$`, 'i') } },  // case-insensitive regex match
        { Team2: { $regex: new RegExp(`^${team1}$`, 'i') } }   // case-insensitive regex match
      ];
    }

    console.log("Query:", query); // Debug log

    const schedules = await Schedules.find(query);

    // if (schedules.length === 0) {
    //   return res.status(404).send({
    //     message: "No schedules found for the given date and team",
    //     status: false
    //   });
    // }

    res.status(200).send({
      message: "Schedules fetched successfully",
      status: true,
      schedules
    });
  } catch (error) {
    console.error("Error fetching schedules:", error);
    res.status(500).send({
      message: "Error fetching schedules",
      status: false,
      error: error.message
    });
  }
});

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