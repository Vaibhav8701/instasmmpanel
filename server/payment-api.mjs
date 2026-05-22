import "dotenv/config";
import express from "express";
import { createCashfreePayment, getOrderPaymentStatus } from "./cashfree.mjs";
import { checkRazorpayEnv, createRazorpayPayment, verifyRazorpaySignature } from "./razorpay.mjs";

function parseEnabled(value, fallback) {
  if (typeof value !== "string") return fallback;
  return /^(1|true|yes|on)$/i.test(value.trim());
}

function getGatewayEnabled(name, fallback) {
  const envKey = `VITE_PAYMENT_${name.toUpperCase()}_ENABLED`;
  const legacyKey = `PAYMENT_${name.toUpperCase()}_ENABLED`;
  return parseEnabled(process.env[envKey] ?? process.env[legacyKey], fallback);
}

export function createPaymentRouter() {
  const router = express.Router();

  router.post("/payment/create", async (req, res) => {
    try {
      const { amount, phone, packageLabel, profileLink, gateway } = req.body ?? {};
      const selectedGateway = String(gateway || "cashfree").toLowerCase();
      const availableGateways = {
        cashfree: getGatewayEnabled("cashfree", true),
        razorpay: getGatewayEnabled("razorpay", false),
      };

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }
      if (!phone || String(phone).replace(/\D/g, "").length !== 10) {
        return res.status(400).json({ error: "Valid 10-digit phone is required" });
      }

      if (!availableGateways[selectedGateway]) {
        return res.status(400).json({ error: `${selectedGateway} is disabled by server env` });
      }

      const result =
        selectedGateway === "razorpay"
          ? await createRazorpayPayment({
              amount: Number(amount),
              phone: String(phone).replace(/\D/g, ""),
              packageLabel: packageLabel || "Instagram followers",
              profileLink: profileLink || "",
            })
          : await createCashfreePayment({
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

  router.post("/payment/razorpay/verify", async (req, res) => {
    try {
      const body = req.body ?? {};
      const orderId = body.orderId || body.razorpay_order_id;
      const paymentId = body.paymentId || body.razorpay_payment_id;
      const signature = body.signature || body.razorpay_signature;

      if (!orderId || !paymentId || !signature) {
        return res.status(400).json({ error: "Missing Razorpay verification details" });
      }

      if (!checkRazorpayEnv().hasKeyId || !checkRazorpayEnv().hasSecret) {
        return res.status(500).json({ error: "Razorpay credentials not configured on server" });
      }

      const result = verifyRazorpaySignature({
        orderId: String(orderId),
        paymentId: String(paymentId),
        signature: String(signature),
      });

      res.json(result);
    } catch (err) {
      console.error("[payment/razorpay/verify]", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Failed to verify Razorpay payment",
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
