import "dotenv/config";
import express from "express";
import { createCashfreePayment, getOrderPaymentStatus } from "./cashfree.mjs";

export function createPaymentRouter() {
  const router = express.Router();

  router.post("/payment/create", async (req, res) => {
    try {
      const { amount, phone, packageLabel, profileLink } = req.body ?? {};

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }
      if (!phone || String(phone).replace(/\D/g, "").length !== 10) {
        return res.status(400).json({ error: "Valid 10-digit phone is required" });
      }

      const result = await createCashfreePayment({
        amount: Number(amount),
        phone: String(phone).replace(/\D/g, ""),
        packageLabel: packageLabel || "Instagram followers",
        profileLink: profileLink || "",
      });

      res.json(result);
    } catch (err) {
      console.error("[payment/create]", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Failed to create payment",
      });
    }
  });

  router.get("/payment/status/:orderId", async (req, res) => {
    try {
      const status = await getOrderPaymentStatus(req.params.orderId);
      res.json(status);
    } catch (err) {
      console.error("[payment/status]", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Failed to check payment status",
      });
    }
  });

  return router;
}

export function mountPaymentApi(app) {
  app.use(express.json());
  app.use("/api", createPaymentRouter());
}
