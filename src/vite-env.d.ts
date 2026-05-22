/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAYMENT_CASHFREE_ENABLED?: string;
  readonly VITE_PAYMENT_RAZORPAY_ENABLED?: string;
  readonly VITE_CASHFREE_ENABLED?: string;
  readonly VITE_RAZORPAY_ENABLED?: string;
}
