function setJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

const CF_API_VERSION = "2023-08-01";

function getCashfreeBaseUrl() {
  return process.env.CASHFREE_ENV === "sandbox"
    ? "https://sandbox.cashfree.com/pg"
    : "https://api.cashfree.com/pg";
}

function cashfreeHeaders() {
  const appId = process.env.CASHFREE_APP_ID;
  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!appId || !secret) {
    throw new Error("Cashfree credentials are not configured (CASHFREE_APP_ID, CASHFREE_SECRET_KEY)");
  }
  return {
    "Content-Type": "application/json",
    "x-api-version": CF_API_VERSION,
    "x-client-id": appId,
    "x-client-secret": secret,
  };
}

async function cashfreeRequest(path, options = {}) {
  const res = await fetch(`${getCashfreeBaseUrl()}${path}`, {
    ...options,
    headers: { ...cashfreeHeaders(), ...options.headers },
  });
  const rawText = await res.text();
  let data = {};
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }
  }
  if (!res.ok) {
    const message =
      data?.message ||
      data?.error?.message ||
      (typeof data?.error === "string" ? data.error : null) ||
      rawText ||
      `Cashfree request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

async function getOrderPaymentStatus(orderId) {
  const order = await cashfreeRequest(`/orders/${encodeURIComponent(orderId)}`);
  return {
    orderId: order.order_id,
    orderStatus: order.order_status,
    orderAmount: order.order_amount,
    isPaid: order.order_status === "PAID",
  };
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