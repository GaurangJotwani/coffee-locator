import express from "express";
import { MongoClient } from "mongodb";
import { ObjectId } from "mongodb";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Replace <DB_URL> and <DB_NAME> with your actual MongoDB server URL and database name
const DB_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017";
const DB_NAME = "storeLocator";

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


router.get("/", async (req, res) => {
  let mongoclient;
  let dbStores = [];
  try {
    mongoclient = await connectToMongoDB();
    const db = mongoclient.db("storeLocator");
    const collection = db.collection("stores");
    const collection2 = db.collection("zipCount");
    const zipCode = req.query.zip_code;
    const googleMapsUrl = "https://maps.googleapis.com/maps/api/geocode/json";
    const response = await axios.get(googleMapsUrl, {
      params: {
        address: zipCode,
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    const data = response.data;
    if (data.status == "ZERO_RESULTS") {
      return res.status(500).send("ZERO_RESULTS");
    }
    const coordinates = [
      data.results[0].geometry.location.lng,
      data.results[0].geometry.location.lat,
    ];
    const maxDistance = 5000;
    const query = {
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: coordinates,
          },
          $maxDistance: maxDistance,
        },
      },
    };
    await collection.createIndex({ location: "2dsphere" });
    const result = await collection.find(query).toArray();
    res.status(200).send({stores:result});
  } catch (error) {
    console.error("Error inserting documents:", error);
    res.status(500).send(error);
  } finally {
    await mongoclient.close();
  }
});

router.post("/", async (req, res) => {
  let mongoclient;
  let dbStores = [];
  let stores = req.body;
  stores.forEach((store) => {
    dbStores.push({
      storeName: store.name,
      phoneNumber: store.phoneNumber,
      address: store.address,
      openStatusText: store.openStatusText,
      addressLines: store.addressLines,
      location: {
        type: "Point",
        coordinates: [store.coordinates.longitude, store.coordinates.latitude],
      },
    });
  });
  try {
    mongoclient = await connectToMongoDB();
    const db = mongoclient.db("storeLocator");
    const collection = db.collection("stores");
    const result = await collection.insertMany(dbStores);
    res.status(200).send(dbStores);
  } catch (error) {
    console.error("Error inserting documents:", error);
    res.status(500).send(error);
  } finally {
    await mongoclient.close();
  }
});

router.delete("/", async (req, res) => {
  let mongoclient;
  let dbStores = req.body;
  try {
    mongoclient = await connectToMongoDB();
    const db = mongoclient.db("storeLocator");
    const collection = db.collection("stores");
    await collection.deleteMany({});
    res.status(200).json({ message: "Success" });
  } catch (error) {
    console.error("An error occurred:", error.message);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await mongoclient.close();
  }
});

// Default export
export default router;
