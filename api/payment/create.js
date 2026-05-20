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

function normalizeQrImage(payload) {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload.qrcode ?? payload.qr_code ?? payload.qrCode ?? payload.image ?? payload.qr_image ?? null;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const value = raw.trim();
  if (value.startsWith("data:image")) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `data:image/png;base64,${value}`;
}

async function createCashfreePayment({ amount, phone, packageLabel, profileLink }) {
  const orderId = `insta_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const order = await cashfreeRequest("/orders", {
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
      order_amount: Number(amount),
      order_currency: "INR",
      customer_details: {
        customer_id: `cust_${phone}`,
        customer_phone: `+91${phone}`,
        customer_email: `${phone}@instasmm.in`,
        customer_name: "InstaSMM Customer",
      },
      order_meta: {
        return_url: process.env.CASHFREE_RETURN_URL || "https://instasmmpanel.in/?payment=success",
        ...(process.env.CASHFREE_NOTIFY_URL ? { notify_url: process.env.CASHFREE_NOTIFY_URL } : {}),
      },
      order_note: `${packageLabel} — ${profileLink}`,
    }),
  });

  const paymentSessionId = order.payment_session_id;
  if (!paymentSessionId) {
    throw new Error("Cashfree did not return a payment session");
  }

  let qrImage = null;
  try {
    const pay = await cashfreeRequest("/orders/sessions", {
      method: "POST",
      body: JSON.stringify({
        payment_session_id: paymentSessionId,
        payment_method: {
          upi: { channel: "qrcode" },
        },
      }),
    });
    qrImage = normalizeQrImage(pay.data?.payload) ?? pay.data?.url ?? null;
  } catch (err) {
    console.warn("[cashfree] UPI QR API unavailable, using hosted checkout:", err instanceof Error ? err.message : err);
  }

  return {
    orderId,
    paymentSessionId,
    qrImage,
  };
}

function checkEnv() {
  return {
    hasAppId: Boolean(process.env.CASHFREE_APP_ID),
    hasSecret: Boolean(process.env.CASHFREE_SECRET_KEY),
    env: process.env.CASHFREE_ENV || "(not set)",
  };
}

export default async function handler(req, res) {
  try {
    console.log("[payment/create] invoked", { method: req.method, url: req.url });

    const envState = checkEnv();
    // Log presence only — do not print secrets
    console.log("[payment/create] env", { hasAppId: envState.hasAppId, hasSecret: envState.hasSecret, env: envState.env });

    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return setJson(res, 405, { error: "Method not allowed" });
    }

    // Basic request logging (mask values)
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
    console.error("[payment/create] error", err instanceof Error ? err.stack || err.message : err);
    return setJson(res, 500, {
      error: err instanceof Error ? err.message : "Failed to create payment",
    });
  }
}