function setJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  try {
    console.log("[payment/razorpay/verify] invoked", { method: req.method, url: req.url });

    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return setJson(res, 405, { error: "Method not allowed" });
    }

    const body = req.body ?? {};
    const orderId = body.orderId || body.razorpay_order_id;
    const paymentId = body.paymentId || body.razorpay_payment_id;
    const signature = body.signature || body.razorpay_signature;

    if (!orderId || !paymentId || !signature) {
      return setJson(res, 400, { error: "Missing Razorpay verification details" });
    }

    const { verifyRazorpaySignature } = await import("../../../server/razorpay.mjs");
    const result = verifyRazorpaySignature({
      orderId: String(orderId),
      paymentId: String(paymentId),
      signature: String(signature),
    });

    return setJson(res, 200, result);
  } catch (err) {
    const message = err instanceof Error ? err.stack || err.message : String(err);
    console.error("[payment/razorpay/verify] error", message);
    return setJson(res, 500, {
      error: err instanceof Error ? err.message : "Failed to verify Razorpay payment",
    });
  }
}
