import { load } from "@cashfreepayments/cashfree-js";

type CashfreeInstance = Awaited<ReturnType<typeof load>>;

let cashfreePromise: Promise<CashfreeInstance | null> | null = null;

export function getCashfree() {
  if (!cashfreePromise) {
    cashfreePromise = load({
      mode: "production",
    });
  }
  return cashfreePromise;
}
