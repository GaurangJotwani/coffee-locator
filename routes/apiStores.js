import express from "express";
import { MongoClient } from "mongodb";
import axios from "axios";
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

router.get("/stores/", async (req, res) => {
  let mongoclient;
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
    const maxDistance = 30000;
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
    const result = await collection.find(query).limit(50).toArray();
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // Note: Months are zero-based, so add 1 to get the correct month.
    const day = currentDate.getDate();
    const formattedDate = `${year}-${month < 10 ? "0" : ""}${month}-${
      day < 10 ? "0" : ""
    }${day}`;
    const existingZipCount = await collection2.findOne({
      zipcode: zipCode,
      formattedDate: formattedDate,
    });
    if (existingZipCount) {
      // If the zipcode exists, increment the count
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
      // console.log(`${updatedCount}`);
      res.status(200).json({ stores: result, updatedCount });
    } else {
      // If the zipcode doesn't exist, insert it with a count of 1
      await collection2.insertOne({
        zipcode: zipCode,
        formattedDate: formattedDate,
        count: 1,
      });

      const updatedCount = 1;
      res.status(200).json({ stores: result, updatedCount });
    }
  } catch (error) {
    console.error("Error inserting documents:", error);
    res.status(500).send(error);
  } finally {
    await mongoclient.close();
  }
});

router.post("/stores/", async (req, res) => {
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
    await collection.insertMany(dbStores);
    res.status(200).send(dbStores);
  } catch (error) {
    console.error("Error inserting documents:", error);
    res.status(500).send(error);
  } finally {
    await mongoclient.close();
  }
});

router.delete("/stores/", async (req, res) => {
  let mongoclient;
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
