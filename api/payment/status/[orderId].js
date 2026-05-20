import { getOrderPaymentStatus } from "../../../../server/cashfree.mjs";

function setJson(res, statusCode, payload) {
  res.status(statusCode).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function getSingleParam(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return setJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const orderId = getSingleParam(req.query.orderId);
    if (!orderId) {
      return setJson(res, 400, { error: "Order ID is required" });
    }

    const status = await getOrderPaymentStatus(String(orderId));
    return setJson(res, 200, status);
  } catch (err) {
    console.error("[payment/status]", err);
    return setJson(res, 500, {
      error: err instanceof Error ? err.message : "Failed to check payment status",
    });
  }
}