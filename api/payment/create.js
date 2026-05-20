import { createCashfreePayment } from "../../../server/cashfree.mjs";

function setJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function checkEnv() {
  return {
    hasAppId: Boolean(process.env.CASHFREE_APP_ID),
    hasSecret: Boolean(process.env.CASHFREE_SECRET_KEY),
    env: process.env.CASHFREE_ENV || "(not set)",
  };
}

export default async function handler(req, res) {
  console.log("[payment/create] invoked", { method: req.method, url: req.url });

  const envState = checkEnv();
  // Log presence only — do not print secrets
  console.log("[payment/create] env", { hasAppId: envState.hasAppId, hasSecret: envState.hasSecret, env: envState.env });

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return setJson(res, 405, { error: "Method not allowed" });
  }

  // Basic request logging (mask values)
  try {
    const body = req.body ?? {};
    console.log("[payment/create] bodyKeys", Object.keys(body));

    const { amount, phone, packageLabel, profileLink } = body;

    if (!envState.hasAppId || !envState.hasSecret) {
      console.error("[payment/create] missing cashfree env vars");
      return setJson(res, 500, { error: "Cashfree credentials not configured on server" });
    }

    if (!amount || amount <= 0) {
      return setJson(res, 400, { error: "Invalid amount" });
    }
    if (!phone || String(phone).replace(/\D/g, "").length !== 10) {
      return setJson(res, 400, { error: "Valid 10-digit phone is required" });
    }

    const result = await createCashfreePayment({
      amount: Number(amount),
      phone: String(phone).replace(/\D/g, ""),
      packageLabel: packageLabel || "Instagram followers",
      profileLink: profileLink || "",
    });

    console.log("[payment/create] success", { orderId: result.orderId, hasQr: Boolean(result.qrImage) });
    return setJson(res, 200, result);
  } catch (err) {
    console.error("[payment/create] error", err instanceof Error ? err.message : err);
    return setJson(res, 500, {
      error: err instanceof Error ? err.message : "Failed to create payment",
    });
  }
}