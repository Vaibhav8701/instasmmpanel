import { getOrderPaymentStatus } from "../../../../server/cashfree.mjs";

function setJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function getSingleParam(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req, res) {
  console.log("[payment/status] invoked", { method: req.method, url: req.url });

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return setJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const orderId = getSingleParam(req.query.orderId);
    console.log("[payment/status] orderId", orderId);
    if (!orderId) {
      return setJson(res, 400, { error: "Order ID is required" });
    }

    const status = await getOrderPaymentStatus(String(orderId));
    console.log("[payment/status] status", status);
    return setJson(res, 200, status);
  } catch (err) {
    console.error("[payment/status] error", err instanceof Error ? err.message : err);
    return setJson(res, 500, {
      error: err instanceof Error ? err.message : "Failed to check payment status",
    });
  }
}