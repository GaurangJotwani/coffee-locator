import express from "express";
import dotenv from "dotenv";
import apiRouterStores from "./routes/apiStores.js";
import bodyParser from "body-parser";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// Add CORS headers to allow any origin
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

// parse application/json
app.use(bodyParser.json());
app.use(express.static("frontend"));

app.use(express.json({ limit: "100mb" }));

app.use("/api", apiRouterStores);

app.listen(port, () => console.log(`App listening at port ${port}`));
