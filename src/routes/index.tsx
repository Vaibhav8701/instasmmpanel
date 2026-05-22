import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronDown, Phone, User, ArrowRight, Flame, Star } from "lucide-react";
import gpayLogo from "@/assets/gpay.png";
import phonepeLogo from "@/assets/phonepe.png";
import paytmLogo from "@/assets/paytm.png";
import upiLogo from "@/assets/upi.png";
import whatsappIcon from "@/assets/whatsapp.png";
import instagramIcon from "@/assets/instagram.png";
import { supabase } from "@/integrations/supabase/client";
import { getCashfree } from "@/lib/cashfree";
import { ACTIVE_PAYMENT_GATEWAYS, type PaymentGateway } from "@/lib/payment-gateways";
import { getRazorpayCheckout } from "@/lib/razorpay";

const WHATSAPP_URL = "https://wa.me/916377613761";
const INSTAGRAM_URL = "https://instagram.com/instasmm6";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Instasmmpanel.in — Get Real Instagram Followers (Without Login)" },
      { name: "description", content: "Buy real Instagram followers instantly without login. Secure UPI payments, instant delivery, and 24/7 WhatsApp support." },
    ],
  }),
});

type Pkg = { id: string; label: string; price: number; tag?: "TRENDING" | "POPULAR" };

const MAIN_PACKAGES: Pkg[] = [
  { id: "1k", label: "1K", price: 199 },
  { id: "2_5k", label: "2.5K", price: 498 },
  { id: "5k", label: "5K", price: 599, tag: "TRENDING" },
  { id: "7_5k", label: "7.5K", price: 1493 },
  { id: "10k", label: "10K", price: 1199, tag: "POPULAR" },
  { id: "15k", label: "15K", price: 2985 },
];

const MORE_PACKAGES: Pkg[] = [
  { id: "1000", label: "1K", price: 199 },
  { id: "1500", label: "1.5K", price: 299 },
  { id: "2000", label: "2K", price: 398 },
  { id: "2500", label: "2.5K", price: 498 },
  { id: "3000", label: "3K", price: 597 },
  { id: "3500", label: "3.5K", price: 697 },
  { id: "4000", label: "4K", price: 796 },
  { id: "4500", label: "4.5K", price: 896 },
  { id: "5000", label: "5K", price: 599 },
  { id: "6000", label: "6K", price: 1194 },
  { id: "7000", label: "7K", price: 1393 },
  { id: "7500", label: "7.5K", price: 1493 },
  { id: "8000", label: "8K", price: 1592 },
  { id: "9000", label: "9K", price: 1791 },
  { id: "10000", label: "10K", price: 1199 },
  { id: "12500", label: "12.5K", price: 2488 },
  { id: "50000", label: "50K", price: 5900 },
  { id: "100000", label: "100K", price: 11000 },
];

function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function PackageCard({ pkg, selected, onSelect }: { pkg: Pkg; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative rounded-2xl border-2 px-3 py-5 text-center transition-all ${
        selected
          ? "border-green-500 bg-green-50 ring-2 ring-green-500/40 shadow-md"
          : "border-border bg-card hover:border-brand-pink/50"
      }`}
    >
      {selected && (
        <span className="absolute -top-2 -right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white shadow">
          ✓
        </span>
      )}
      {pkg.tag && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold text-white shadow"
          style={{ background: "var(--gradient-insta)" }}
        >
          {pkg.tag === "TRENDING" ? <Flame className="h-3 w-3" /> : <Star className="h-3 w-3 fill-white" />}
          {pkg.tag}
        </span>
      )}
      <div className={`text-lg font-bold ${selected ? "text-green-700" : "text-foreground"}`}>{pkg.label}</div>
      <div className={`mt-1 text-sm ${selected ? "text-green-700/80" : "text-muted-foreground"}`}>{formatINR(pkg.price)}</div>
    </button>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span
      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ background: "var(--gradient-insta)" }}
    >
      {n}
    </span>
  );
}

function paymentGatewayLabel(gateway: PaymentGateway) {
  return gateway === "cashfree" ? "Cashfree" : "Razorpay";
}

function paymentGatewayDescription(gateway: PaymentGateway) {
  return gateway === "cashfree"
    ? "Hosted checkout with QR and UPI apps"
    : "Razorpay popup checkout with cards, UPI, and wallets";
}

function Index() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [usernameDialogOpen, setUsernameDialogOpen] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [usernameDraft, setUsernameDraft] = useState("");
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [paymentQr, setPaymentQr] = useState<string | null>(null);
  const [cashfreeOrderId, setCashfreeOrderId] = useState<string | null>(null);
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
  const [razorpayOrderId, setRazorpayOrderId] = useState<string | null>(null);
  const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null);
  const [selectedPaymentGateway, setSelectedPaymentGateway] = useState<PaymentGateway | null>(null);
  const checkoutContainerRef = useRef<HTMLDivElement | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const razorpayCheckoutStartedRef = useRef(false);

  const phoneSectionRef = useRef<HTMLElement | null>(null);
  const usernameSectionRef = useRef<HTMLElement | null>(null);

  const selected = useMemo(
    () => [...MAIN_PACKAGES, ...MORE_PACKAGES].find((p) => p.id === selectedId) ?? null,
    [selectedId],
  );

  const canPay = selected && phone.length === 10 && username.trim().length > 0;
  const activeGateways = ACTIVE_PAYMENT_GATEWAYS;
  const hasMultipleGateways = activeGateways.length > 1;
  const hasAnyGateway = activeGateways.length > 0;

  const handleSelectPackage = (id: string) => {
    setSelectedId(id);
    setPhoneDraft(phone);
    setTimeout(() => {
      phoneSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setPhoneDialogOpen(true);
    }, 200);
  };

  const handlePhoneSubmit = () => {
    if (phoneDraft.length !== 10) return;
    setPhone(phoneDraft);
    setPhoneDialogOpen(false);
    setUsernameDraft(username);
    setTimeout(() => {
      usernameSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setUsernameDialogOpen(true);
    }, 250);
  };

  const handleUsernameSubmit = () => {
    if (usernameDraft.trim().length === 0) return;
    setUsername(usernameDraft.trim());
    setUsernameDialogOpen(false);
  };

  const resetPaymentSession = () => {
    setPaymentQr(null);
    setCashfreeOrderId(null);
    setPaymentSessionId(null);
    setRazorpayOrderId(null);
    setRazorpayKeyId(null);
    setSelectedPaymentGateway(null);
    setPaymentSuccess(false);
    setPaymentError(null);
    razorpayCheckoutStartedRef.current = false;
  };

  const openPaymentFlow = () => {
    if (!canPay || !hasAnyGateway) return;

    if (activeGateways.length === 1) {
      void startPayment(activeGateways[0]);
      return;
    }

    resetPaymentSession();
    setPayDialogOpen(true);
  };

  async function startPayment(gateway: PaymentGateway) {
    if (!canPay || !selected) return;

    setPaymentLoading(true);
    setPaymentError(null);
    setPaymentSuccess(false);
    setSelectedPaymentGateway(gateway);
    setPaymentQr(null);
    setCashfreeOrderId(null);
    setPaymentSessionId(null);
    setRazorpayOrderId(null);
    setRazorpayKeyId(null);
    razorpayCheckoutStartedRef.current = false;

    try {
      await supabase.from("orders").insert({
        package_label: selected.label,
        package_quantity: parseInt(selected.id.replace(/\D/g, ""), 10) || 0,
        amount: selected.price,
        phone,
        profile_link: username,
      });
    } catch (err) {
      console.error("Failed to save order", err);
    }

    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selected.price,
          phone,
          packageLabel: `${selected.label} followers`,
          profileLink: username,
          gateway,
        }),
      });

      const text = await res.text();
      let data: {
        orderId?: string;
        paymentSessionId?: string;
        qrImage?: string | null;
        razorpayOrderId?: string;
        keyId?: string;
        amountPaise?: number;
        error?: string;
      } = {};

      try {
        data = text ? (JSON.parse(text) as typeof data) : {};
      } catch {
        console.error("/api/payment/create returned non-JSON response:", text);
        throw new Error(text || "Server returned an unexpected response");
      }

      if (!res.ok) {
        throw new Error(data.error || `Could not start ${paymentGatewayLabel(gateway)} payment`);
      }

      if (gateway === "cashfree") {
        if (!data.paymentSessionId || !data.orderId) {
          throw new Error("Invalid Cashfree payment response from server");
        }

        setCashfreeOrderId(data.orderId);
        setPaymentSessionId(data.paymentSessionId);
        if (data.qrImage) setPaymentQr(data.qrImage);
      } else {
        if (!data.razorpayOrderId || !data.keyId) {
          throw new Error("Invalid Razorpay payment response from server");
        }

        setRazorpayOrderId(data.razorpayOrderId);
        setRazorpayKeyId(data.keyId);
      }

      setPayDialogOpen(true);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Payment failed. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  }

  useEffect(() => {
    if (!payDialogOpen || selectedPaymentGateway !== "cashfree" || !paymentSessionId || paymentQr) return;

    let cancelled = false;

    (async () => {
      await new Promise((r) => window.setTimeout(r, 150));
      const container = checkoutContainerRef.current;
      if (!container || cancelled) return;

      const cashfree = await getCashfree();
      if (!cashfree || cancelled) return;

      try {
        const result = await cashfree.checkout({
          paymentSessionId,
          redirectTarget: container,
        });
        if (cancelled) return;
        if (result?.error) {
          setPaymentError(result.error.message || "Payment was not completed");
          return;
        }
        setPaymentSuccess(true);
        window.setTimeout(() => setPayDialogOpen(false), 2500);
      } catch (err) {
        if (!cancelled) {
          setPaymentError(err instanceof Error ? err.message : "Cashfree checkout failed");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [payDialogOpen, paymentSessionId, paymentQr, selectedPaymentGateway]);

  useEffect(() => {
    if (!payDialogOpen || selectedPaymentGateway !== "cashfree" || !cashfreeOrderId || paymentSuccess) return;

    const interval = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status/${encodeURIComponent(cashfreeOrderId)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { isPaid?: boolean };
        if (data.isPaid) {
          setPaymentSuccess(true);
          window.setTimeout(() => setPayDialogOpen(false), 2500);
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [payDialogOpen, cashfreeOrderId, paymentSuccess, selectedPaymentGateway]);

  useEffect(() => {
    if (!payDialogOpen || selectedPaymentGateway !== "razorpay" || !razorpayOrderId || paymentSuccess || paymentError) return;
    if (razorpayCheckoutStartedRef.current) return;

    let cancelled = false;
    razorpayCheckoutStartedRef.current = true;

    (async () => {
      const Razorpay = await getRazorpayCheckout();
      if (!Razorpay || cancelled) {
        setPaymentError("Razorpay checkout failed to load");
        return;
      }

      const checkout = new Razorpay({
        key: razorpayKeyId,
        amount: selected?.price ? Math.round(selected.price * 100) : undefined,
        currency: "INR",
        name: "Instasmmpanel.in",
        description: `${selected?.label ?? "Instagram"} followers`,
        order_id: razorpayOrderId,
        prefill: {
          contact: phone,
          name: "InstaSMM Customer",
        },
        notes: {
          profileLink: username,
        },
        theme: {
          color: "#e11d48",
        },
        modal: {
          ondismiss: () => {
            if (!paymentSuccess) {
              setPaymentError("Payment window closed before completion");
            }
          },
        },
        handler: async (response: Record<string, string>) => {
          try {
            const verifyRes = await fetch("/api/payment/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });

            const verifyText = await verifyRes.text();
            let verifyData: { verified?: boolean; error?: string } = {};

            try {
              verifyData = verifyText ? (JSON.parse(verifyText) as typeof verifyData) : {};
            } catch {
              throw new Error(verifyText || "Unable to verify Razorpay payment");
            }

            if (!verifyRes.ok || !verifyData.verified) {
              throw new Error(verifyData.error || "Razorpay verification failed");
            }

            setPaymentSuccess(true);
            window.setTimeout(() => setPayDialogOpen(false), 2500);
          } catch (err) {
            setPaymentError(err instanceof Error ? err.message : "Razorpay payment verification failed");
          }
        },
      });

      checkout.open();
    })();

    return () => {
      cancelled = true;
    };
  }, [payDialogOpen, selectedPaymentGateway, razorpayOrderId, razorpayKeyId, paymentSuccess, paymentError, selected, phone, username]);

  const startRazorpayPayment = () => startPayment("razorpay");

  const closePaymentDialog = (open: boolean) => {
    setPayDialogOpen(open);
    if (!open) {
      resetPaymentSession();
    }
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="mx-auto flex max-w-xl items-center justify-between px-5 py-4">
        <h1 className="text-xl font-extrabold tracking-tight">
          Insta<span className="text-brand-pink">smm</span>panel.in
        </h1>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-whatsapp-soft px-4 py-2 text-sm font-semibold text-whatsapp"
        >
          <img src={whatsappIcon} alt="WhatsApp" className="h-4 w-4" /> WhatsApp
        </a>
      </header>

      {/* Hero banner */}
      <section
        className="hero-animated mx-auto max-w-xl px-5 py-7 text-center text-white"
      >
        <h2 className="text-xl font-bold leading-tight sm:text-2xl">
          Get Real Instagram Followers (Without Login)
        </h2>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-pink shadow">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-pink animate-pulse" />
          Instant Delivery Active
        </div>
      </section>

      <div className="mx-auto max-w-xl space-y-7 px-5 py-7">
        {/* Step 1: Packages */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <StepBadge n={1} />
            <h3 className="font-semibold">Choose Package</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {MAIN_PACKAGES.map((p) => (
              <PackageCard key={p.id} pkg={p} selected={selectedId === p.id} onSelect={() => handleSelectPackage(p.id)} />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="mt-4 flex w-full items-center justify-between rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-medium text-foreground"
          >
            More options...
            <ChevronDown className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
          </button>
          {moreOpen && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {MORE_PACKAGES.map((p) => (
                <PackageCard key={p.id} pkg={p} selected={selectedId === p.id} onSelect={() => handleSelectPackage(p.id)} />
              ))}
            </div>
          )}
        </section>

        {/* Step 2: Phone */}
        <section ref={phoneSectionRef}>
          <div className="mb-3 flex items-center gap-2">
            <StepBadge n={2} />
            <h3 className="font-semibold">Your Phone Number</h3>
          </div>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="Enter 10-digit mobile number"
              className="w-full rounded-xl border border-border bg-card py-3.5 pl-11 pr-4 text-sm outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/20"
            />
          </div>
        </section>

        {/* Step 3: Username */}
        <section ref={usernameSectionRef}>
          <div className="mb-3 flex items-center gap-2">
            <StepBadge n={3} />
            <h3 className="font-semibold">Instagram Username/ profile link</h3>
          </div>
          <div className="relative">
            <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
              className="w-full rounded-xl border border-border bg-card py-3.5 pl-11 pr-4 text-sm outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/20"
            />
          </div>
        </section>

        {/* Pay button */}
        {paymentError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {paymentError}
          </p>
        )}

        <button
          type="button"
          disabled={!canPay || paymentLoading || !hasAnyGateway}
          onClick={openPaymentFlow}
          className={`flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left text-white transition-all disabled:cursor-not-allowed disabled:opacity-60 ${canPay ? "pay-pulse ring-4 ring-brand-pink/40" : ""}`}
          style={{ background: canPay ? "var(--gradient-insta)" : "oklch(0.85 0.01 270)" }}
        >
          <div>
              <div className="text-base font-bold">
                {paymentLoading ? "Starting payment…" : hasMultipleGateways ? "Choose payment method" : "Pay & Place Order"}
              </div>
            <div className="text-xs opacity-90">
              {selected ? `${selected.label} followers` : "Select package to continue"}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-white/25 px-3 py-1.5 text-sm font-bold">
              {formatINR(selected?.price ?? 0)}
            </span>
            <ArrowRight className="h-5 w-5" />
          </div>
        </button>

        {/* Payment methods */}
        <div className="flex items-center justify-center gap-5 py-2">
          <img src={gpayLogo} alt="GPay" className="h-7 object-contain" />
          <img src={phonepeLogo} alt="PhonePe" className="h-7 object-contain" />
          <img src={paytmLogo} alt="Paytm" className="h-7 object-contain" />
          <img src={upiLogo} alt="UPI" className="h-7 object-contain" />
        </div>

        {/* Help card */}
        <section id="whatsapp" className="rounded-2xl border border-border bg-secondary/60 p-6">
          <h3 className="text-xl font-bold">Need Help?</h3>
          <p className="mt-1 text-sm text-muted-foreground">Average response time under 15 minutes</p>
          <div className="mt-5 space-y-3">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-whatsapp px-5 py-4 text-base font-bold text-white shadow-lg shadow-whatsapp/30"
            >
              <img src={whatsappIcon} alt="" className="h-6 w-6" /> WhatsApp Support
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-bold text-white shadow-lg"
              style={{ background: "var(--gradient-insta)" }}
            >
              <img src={instagramIcon} alt="" className="h-6 w-6" /> Instagram Support
            </a>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-black px-5 py-6 text-center text-white">
        <div className="mx-auto max-w-xl text-sm">
          <p className="text-xs text-white/60">© 2026 Instasmmpanel.in All rights reserved.</p>
        </div>
      </footer>

      {/* Phone dialog */}
      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Enter your mobile number</DialogTitle>
            <DialogDescription>
              We'll use this to send order updates on WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              inputMode="numeric"
              maxLength={10}
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value.replace(/\D/g, "").slice(0, 10))}
              onKeyDown={(e) => { if (e.key === "Enter") handlePhoneSubmit(); }}
              placeholder="10-digit mobile number"
              className="w-full rounded-xl border border-border bg-card py-3.5 pl-11 pr-4 text-sm outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/20"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={handlePhoneSubmit}
              disabled={phoneDraft.length !== 10}
              className="w-full text-white"
              style={{ background: "var(--gradient-insta)" }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Username dialog */}
      <Dialog open={usernameDialogOpen} onOpenChange={setUsernameDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Enter Instagram username</DialogTitle>
            <DialogDescription>
              Please fill your username or profile link to receive followers.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={usernameDraft}
              onChange={(e) => setUsernameDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleUsernameSubmit(); }}
              placeholder="@username or profile link"
              className="w-full rounded-xl border border-border bg-card py-3.5 pl-11 pr-4 text-sm outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/20"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={handleUsernameSubmit}
              disabled={usernameDraft.trim().length === 0}
              className="w-full text-white"
              style={{ background: "var(--gradient-insta)" }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cashfree UPI QR dialog */}
      <Dialog open={payDialogOpen} onOpenChange={closePaymentDialog}>
        <DialogContent className="max-h-[calc(100dvh-0.75rem)] w-[calc(100vw-0.75rem)] max-w-none overflow-hidden border-0 bg-[#0b0b0f] p-0 text-white shadow-none sm:max-h-[calc(100dvh-1rem)] sm:w-[calc(100vw-1rem)] sm:max-w-5xl sm:rounded-3xl sm:border sm:border-white/10 sm:shadow-2xl">
          <div className="flex h-full min-h-0 flex-col md:grid md:min-h-[min(760px,calc(100vh-2rem))] md:grid-cols-[0.95fr_1.05fr]">
            <aside className="hidden flex-col justify-between bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.22),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_28%),linear-gradient(180deg,#0f0f15,#09090c)] px-5 py-6 sm:px-6 sm:py-7 md:flex">
              <DialogHeader className="space-y-4 text-left">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                  Secure checkout
                </div>
                <div className="space-y-2">
                  <DialogTitle className="text-2xl font-semibold leading-tight text-white sm:text-3xl">
                    Pay {formatINR(selected?.price ?? 0)} for {selected?.label} followers
                  </DialogTitle>
                  <DialogDescription className="max-w-md text-sm leading-6 text-white/65">
                    {paymentSuccess
                      ? "Payment received. Your order is being processed."
                      : "Use Cashfree checkout or scan the QR code with any UPI app. The layout is optimized for phones and large screens."}
                  </DialogDescription>
                </div>
              </DialogHeader>

              <div className="mt-6 space-y-3 text-sm text-white/75">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/50">Order</div>
                  <div className="mt-1 font-medium text-white">{selected?.label} followers</div>
                  <div className="mt-1 text-white/65">{formatINR(selected?.price ?? 0)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/50">Customer</div>
                  <div className="mt-1 font-medium text-white">+91 {phone || "••••••••••"}</div>
                  <div className="mt-1 break-all text-white/65">{username || "Instagram profile / link"}</div>
                </div>
                {cashfreeOrderId && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-white/50">Order ID</div>
                    <div className="mt-1 break-all text-xs text-white/70">{cashfreeOrderId}</div>
                  </div>
                )}
              </div>

              <p className="mt-6 text-xs text-white/45">Powered by Cashfree Payments</p>
            </aside>

            <section className="flex min-h-0 flex-1 flex-col bg-[#eef1f6] px-2 pb-2 pt-2 sm:p-6 md:border-l md:border-white/10">
              <div className="mb-2 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.94))] px-4 py-3 text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.08)] md:hidden sm:mb-3 sm:py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Secure checkout</div>
                <div className="mt-1 text-lg font-semibold leading-tight sm:text-xl">Pay {formatINR(selected?.price ?? 0)}</div>
                <div className="mt-1 text-sm text-slate-600">{selected?.label} followers • {selectedPaymentGateway ? paymentGatewayLabel(selectedPaymentGateway) : "Choose gateway"}</div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[1.4rem] rounded-b-[1.6rem] bg-white shadow-[0_20px_80px_rgba(15,23,42,0.16)] sm:rounded-[1.6rem]">
                <div className="border-b border-slate-200 px-3 py-3 sm:px-5 sm:py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {selectedPaymentGateway ? `${paymentGatewayLabel(selectedPaymentGateway)} Checkout` : "Choose payment method"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {selectedPaymentGateway
                          ? paymentGatewayDescription(selectedPaymentGateway)
                          : "Pick one of the available gateways to continue"}
                      </div>
                    </div>
                    <div className="max-w-[42%] truncate rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:max-w-none">
                      {selected?.label}
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-4">
                  {!selectedPaymentGateway && hasMultipleGateways ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {activeGateways.map((gateway) => (
                        <button
                          key={gateway}
                          type="button"
                          onClick={() => startPayment(gateway)}
                          className="min-h-[150px] rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 text-left transition active:scale-[0.99] hover:border-brand-pink/40 hover:bg-white sm:p-5"
                        >
                          <div className="text-base font-semibold text-slate-900 sm:text-lg">{paymentGatewayLabel(gateway)}</div>
                          <div className="mt-1 text-sm leading-6 text-slate-600">{paymentGatewayDescription(gateway)}</div>
                          <div className="mt-4 inline-flex rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
                            Continue with {paymentGatewayLabel(gateway)}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : paymentSuccess ? (
                    <div className="flex min-h-[280px] items-center justify-center rounded-[1.4rem] border border-emerald-200 bg-emerald-50 p-5 text-center sm:min-h-[420px] sm:p-6">
                      <div>
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
                          ✓
                        </div>
                        <p className="text-lg font-semibold text-emerald-900">Payment successful</p>
                        <p className="mt-1 text-sm text-emerald-700">Your order is being processed now.</p>
                      </div>
                    </div>
                  ) : selectedPaymentGateway === "cashfree" && paymentQr ? (
                    <div className="flex min-h-[280px] items-center justify-center rounded-[1.4rem] border border-slate-200 bg-slate-50 p-2 sm:min-h-[420px] sm:p-6">
                      <div className="w-full max-w-sm rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:max-w-md sm:p-4">
                        <img src={paymentQr} alt="Cashfree UPI QR" className="mx-auto aspect-square w-full max-w-[240px] object-contain sm:max-w-[360px]" />
                        <p className="mt-3 text-center text-xs text-slate-500">Open any UPI app and scan this QR code.</p>
                      </div>
                    </div>
                  ) : selectedPaymentGateway === "razorpay" ? (
                    <div className="flex min-h-[280px] items-center justify-center rounded-[1.4rem] border border-slate-200 bg-slate-50 p-3 text-center sm:min-h-[420px] sm:p-6">
                      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
                        <div className="text-base font-semibold text-slate-900 sm:text-lg">Razorpay popup will open automatically</div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Complete the payment in the Razorpay window. You can pay by UPI, card, or wallet.
                        </p>
                        <button
                          type="button"
                          onClick={startRazorpayPayment}
                          disabled={paymentLoading}
                          className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto sm:px-4 sm:py-2"
                        >
                          Open Razorpay again
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      ref={checkoutContainerRef}
                      className="h-[min(50dvh,24rem)] min-h-[280px] w-full overflow-hidden rounded-[1.4rem] bg-white sm:h-[min(78vh,640px)] sm:min-h-[520px]"
                    />
                  )}
                </div>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
