import { createCashfreePayment } from "../../../server/cashfree.mjs";

function setJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return setJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { amount, phone, packageLabel, profileLink } = req.body ?? {};

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

    return setJson(res, 200, result);
  } catch (err) {
    console.error("[payment/create]", err);
    return setJson(res, 500, {
      error: err instanceof Error ? err.message : "Failed to create payment",
    });
  }
}