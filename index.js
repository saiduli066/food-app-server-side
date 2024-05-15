const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware

// const corsConfig = {
//   origin: "http://localhost:5173/",
//   credentials: true,
//   methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
// };
// app.use(cors(corsConfig));
// app.options("", cors(corsConfig));
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("assignment");
    const collection = db.collection("users");

    const foodDB = client.db("foodDistributionDB");
    const productsCollection = foodDB.collection("products");

    // User Registration
    app.post("/api/v1/register", async (req, res) => {
      const { name, email, password } = req.body;

      // Check if email already exists
      const existingUser = await collection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await collection.insertOne({ name, email, password: hashedPassword });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login
    app.post("/api/v1/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await collection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.EXPIRES_IN,
      });

      res.json({
        success: true,
        message: "Login successful",
        token,
      });
    });

    // ==============================================================

    //get products...
    app.get("/products", async (req, res) => {
      try {
        const products = await productsCollection.find().toArray();
        res.send(products);
      } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    //get by id
    app.get("/products/:id", async (req, res) => {
      try {
        const id = req.params.id;
        //   console.log(id)
        const filter = { _id: new ObjectId(id) };
        const product = await productsCollection.findOne(filter);
        res.send(product);
      } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    //post products
    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      //  console.log(newProduct);
      try {
        const result = await productsCollection.insertOne(newProduct);
        res.send(result);
      } catch (error) {
        console.error("Posting Error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    //update products
    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          image: req.body.image,
          title: req.body.title,
          category: req.body.category,
          quantity: req.body.quantity,
          description: req.body.description,
        },
      };
      console.log("updated doc: ", updatedDoc);
      const result = await productsCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    //delete
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    // ==============================================================

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
