import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import axios from "axios";
import dotenv from "dotenv";
import apiRouterStores from "./routes/apiStores.js";

dotenv.config();

async function connectToMongoDB() {
  try {
    // Connect to the MongoDB server
    const client = new MongoClient(DB_URL, {});
    await client.connect();
    console.log("Connected to MongoDB");
    return client;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

const app = express();
const port = process.env.PORT || 3000;
app.use(express.static("frontend"));

app.use(express.json({ limit: "100mb" }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  // Add other CORS headers as needed
  next();
});

app.use("/api", apiRouterStores);

app.listen(port, () => console.log(`App listening at port ${port}`));
