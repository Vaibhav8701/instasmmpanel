import crypto from "node:crypto";
import Razorpay from "razorpay";

const RAZORPAY_CURRENCY = "INR";

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)");
  }

  return { keyId, keySecret };
}

function getRazorpayClient() {
  const { keyId, keySecret } = getRazorpayConfig();
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "").slice(0, 10);
}

function normalizeAmount(amount) {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Invalid amount");
  }
  return parsed;
}

function makeOrderRef() {
  return `insta_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function checkRazorpayEnv() {
  return {
    hasKeyId: Boolean(process.env.RAZORPAY_KEY_ID),
    hasSecret: Boolean(process.env.RAZORPAY_KEY_SECRET),
  };
}

export async function createRazorpayPayment({ amount, phone, packageLabel, profileLink }) {
  const amountInRupees = normalizeAmount(amount);
  const amountPaise = Math.round(amountInRupees * 100);
  const normalizedPhone = normalizePhone(phone);
  const orderRef = makeOrderRef();
  const client = getRazorpayClient();

  const order = await client.orders.create({
    amount: amountPaise,
    currency: RAZORPAY_CURRENCY,
    receipt: orderRef,
    notes: {
      phone: normalizedPhone,
      packageLabel: packageLabel || "Instagram followers",
      profileLink: profileLink || "",
      orderRef,
    },
  });

  return {
    gateway: "razorpay",
    orderId: orderRef,
    razorpayOrderId: order.id,
    keyId: getRazorpayConfig().keyId,
    amount: amountInRupees,
    amountPaise,
  };
}

export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  const { keySecret } = getRazorpayConfig();
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (expectedSignature !== signature) {
    throw new Error("Invalid Razorpay signature");
  }

  return {
    verified: true,
    orderId,
    paymentId,
  };
}
