import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { mountPaymentApi } from "./server/payment-api.mjs";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 3000;

mountPaymentApi(app);

app.use("/assets", express.static(path.join(__dirname, "dist/client/assets")));

app.use(express.static(path.join(__dirname, "dist/client")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist/client/index.html"));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
