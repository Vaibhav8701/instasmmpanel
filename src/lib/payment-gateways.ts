export type PaymentGateway = "cashfree" | "razorpay";

function parseEnabled(value: unknown, fallback: boolean) {
  if (typeof value !== "string") return fallback;
  return /^(1|true|yes|on)$/i.test(value.trim());
}

const env = import.meta.env as Record<string, string | undefined>;

export const PAYMENT_GATEWAYS: Record<PaymentGateway, boolean> = {
  cashfree: parseEnabled(env.VITE_PAYMENT_CASHFREE_ENABLED ?? env.VITE_CASHFREE_ENABLED, true),
  razorpay: parseEnabled(env.VITE_PAYMENT_RAZORPAY_ENABLED ?? env.VITE_RAZORPAY_ENABLED, false),
};

export const ACTIVE_PAYMENT_GATEWAYS = (Object.keys(PAYMENT_GATEWAYS) as PaymentGateway[]).filter(
  (gateway) => PAYMENT_GATEWAYS[gateway],
);
