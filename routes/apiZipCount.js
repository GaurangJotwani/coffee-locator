import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Replace <DB_URL> and <DB_NAME> with your actual MongoDB server URL and database name
const DB_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017";

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

// Common function to insert or update zip count
async function insertOrUpdateZipCount(zipCode) {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();
  const formattedDate = `${year}-${month < 10 ? "0" : ""}${month}-${
    day < 10 ? "0" : ""
  }${day}`;

  const mongoclient = await connectToMongoDB();
  const db = mongoclient.db("storeLocator");
  const collection2 = db.collection("zipCount");

  // Find the zip count for the specified zip code and date
  const existingZipCount = await collection2.findOne({
    zipcode: zipCode,
    formattedDate: formattedDate,
  });

  if (existingZipCount) {
    // If the zipcode exists for today, update the count
    await collection2.updateOne(
      { zipcode: zipCode, formattedDate: formattedDate },
      { $inc: { count: 1 } }
    );

    // Get the updated count value
    const updatedCount = (
      await collection2.findOne({
        zipcode: zipCode,
        formattedDate: formattedDate,
      })
    ).count;

    mongoclient.close();

    return updatedCount;
  } else {
    // If the zipcode doesn't exist for today, insert it with a count of 1
    await collection2.insertOne({
      zipcode: zipCode,
      formattedDate: formattedDate,
      count: 1,
    });

    mongoclient.close();

    return 1;
  }
}

// Route to get zip count
router.get("/", async (req, res) => {
  // const mongoclient = await connectToMongoDB();
  // const db = mongoclient.db("storeLocator");
  // const collection2 = db.collection("zipCount");
  try {
    const zipCode = req.query.zip_code;
    const updatedCount = await insertOrUpdateZipCount(zipCode);
    console.log("");
    res.status(200).json({ updatedCount });
  } catch (error) {
    console.error("An error occurred:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route to create or update zip count
router.post("/", async (req, res) => {
  try {
    const zipCode = req.body.zip_code;
    const updatedCount = await insertOrUpdateZipCount(zipCode);
    res.status(200).json({ updatedCount });
  } catch (error) {
    console.error("An error occurred:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route to delete zip count
router.delete("/", async () => {});

// Default export
export default router;
