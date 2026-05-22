declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on?: (eventName: string, handler: (payload: unknown) => void) => void;
    };
  }
}

let razorpayScriptPromise: Promise<Window["Razorpay"] | null> | null = null;

export async function getRazorpayCheckout() {
  if (typeof window === "undefined") return null;
  if (window.Razorpay) return window.Razorpay;

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
      );

      const finish = () => resolve(window.Razorpay ?? null);

      if (existingScript) {
        if (window.Razorpay) {
          finish();
          return;
        }

        existingScript.addEventListener("load", finish, { once: true });
        existingScript.addEventListener("error", () => resolve(null), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = finish;
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }

  return razorpayScriptPromise;
}
