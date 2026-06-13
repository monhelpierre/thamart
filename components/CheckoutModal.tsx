"use client";

import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useI18n } from "@/lib/i18n";
import { auth, db, getAuthToken } from "@/lib/firebase";
import { formatBRL, type Product } from "@/data/products";
import { lookupCep, shippingRate, formatDeliveryRange } from "@/lib/shipping";
import type { AppUser } from "@/lib/firebase";
import type { CartMap } from "@/components/CartDrawer";

type Stage = "address" | "qr" | "confirmation";

interface AddressState {
    cep: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    country: string;
}

interface Props {
    open: boolean;
    cart: CartMap;
    notes: string;
    products: Product[];
    subtotal: number;
    user: AppUser | null;
    onClose: () => void;
    onComplete: (orderId: string) => void;
}

const EMPTY_ADDRESS: AddressState = {
    cep: "", street: "", number: "", complement: "",
    neighborhood: "", city: "", state: "", country: "BR",
};

export default function CheckoutModal({
    open, cart, notes, products, subtotal, user, onClose, onComplete,
}: Props) {
    const { t, lang } = useI18n();
    const [stage, setStage] = useState<Stage>("address");
    const [address, setAddress] = useState<AddressState>(EMPTY_ADDRESS);
    const [cepLoading, setCepLoading] = useState(false);
    const [cepError, setCepError] = useState("");
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [savedAddress, setSavedAddress] = useState<AddressState | null>(null);
    const [addressMode, setAddressMode] = useState<"saved" | "new">("new");
    const [saveAsDefault, setSaveAsDefault] = useState(false);

    const [pixLoading, setPixLoading] = useState(false);
    const [pixError, setPixError] = useState("");
    const [orderId, setOrderId] = useState<string | null>(null);
    const [paymentId, setPaymentId] = useState<string | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [qrBase64, setQrBase64] = useState<string | null>(null);
    const [finalTotal, setFinalTotal] = useState(0);
    const [copied, setCopied] = useState(false);
    const [simulating, setSimulating] = useState(false);
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);

    const unsubscribeRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!open) {
            unsubscribeRef.current?.();
            return;
        }
        setStage("address");
        setAddress(EMPTY_ADDRESS);
        setCepError("");
        setPixError("");
        setOrderId(null);
        setPaymentId(null);
        setQrCode(null);
        setQrBase64(null);
        setPaymentConfirmed(false);
        setCopied(false);
        setSaveAsDefault(false);

        // Fetch saved address
        if (!user) return;
        (async () => {
            try {
                const idToken = await getAuthToken();
                if (!idToken) return;
                const res = await fetch(`/api/users?uid=${encodeURIComponent(user.uid)}`, {
                    headers: { Authorization: `Bearer ${idToken}` },
                });
                if (!res.ok) return;
                const data = await res.json();
                if (data?.defaultAddress?.city) {
                    setSavedAddress(data.defaultAddress as AddressState);
                    setAddressMode("saved");
                    setAddress(data.defaultAddress as AddressState);
                } else {
                    setSavedAddress(null);
                    setAddressMode("new");
                }
            } catch { /* no saved address */ }
        })();
    }, [open, user]);

    // Recalculate shipping when state changes
    useEffect(() => {
        if (address.state) {
            setDeliveryFee(shippingRate(address.state, subtotal));
        }
    }, [address.state, subtotal]);

    // Firestore real-time listener — works when security rules allow client reads
    useEffect(() => {
        if (!orderId) return;
        unsubscribeRef.current?.();
        const unsub = onSnapshot(
            doc(db, "orders", orderId),
            (snap) => {
                if (snap.data()?.status === "paid") {
                    setPaymentConfirmed(true);
                    setStage("confirmation");
                }
            },
            (err) => {
                // Security rules may block this — polling fallback takes over
                console.warn("Firestore order listener blocked:", err.code);
            }
        );
        unsubscribeRef.current = unsub;
        return () => unsub();
    }, [orderId]);

    // Polling fallback — used when Firestore real-time listener is blocked
    useEffect(() => {
        if (!orderId || !user || stage !== "qr") return;
        const poll = setInterval(async () => {
            try {
                const idToken = await getAuthToken();
                if (!idToken) return;
                const res = await fetch(`/api/orders?uid=${encodeURIComponent(user.uid)}`, {
                    headers: { Authorization: `Bearer ${idToken}` },
                });
                if (!res.ok) return;
                const orders: any[] = await res.json();
                const order = orders.find((o) => o.id === orderId);
                if (order?.status === "paid") {
                    setPaymentConfirmed(true);
                    setStage("confirmation");
                }
            } catch { /* silent */ }
        }, 3000);
        return () => clearInterval(poll);
    }, [orderId, user, stage]);

    async function handleCepChange(value: string) {
        const formatted = value
            .replace(/\D/g, "")
            .replace(/^(\d{5})(\d)/, "$1-$2")
            .slice(0, 9);
        setAddress((a) => ({ ...a, cep: formatted }));
        setCepError("");

        const digits = formatted.replace(/\D/g, "");
        if (digits.length === 8) {
            setCepLoading(true);
            const result = await lookupCep(digits);
            setCepLoading(false);
            if (result.ok) {
                setAddress((a) => ({
                    ...a,
                    street: result.street,
                    neighborhood: result.neighborhood,
                    city: result.city,
                    state: result.state,
                    cep: result.cep,
                }));
            } else {
                setCepError(t("cepNotFound"));
            }
        }
    }

    async function handleAddressNext() {
        if (!address.state || !address.city) {
            setCepError(t("cepNotFound"));
            return;
        }
        if (!address.number.trim()) {
            setCepError("Informe o número");
            return;
        }
        // Save as default if requested
        if (saveAsDefault && user) {
            try {
                const idToken = await getAuthToken();
                if (!idToken) throw new Error();
                await fetch("/api/users", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                    body: JSON.stringify({
                        uid: user.uid,
                        displayName: user.displayName,
                        email: user.email,
                        photoURL: user.photoURL,
                        defaultAddress: address,
                    }),
                });
            } catch { /* non-blocking */ }
        }
        setStage("qr");
        await createPixPayment();
    }

    async function createPixPayment() {
        setPixLoading(true);
        setPixError("");
        try {
            const idToken = await getAuthToken();
            if (!idToken) throw new Error("Not authenticated");
            const res = await fetch("/api/pix", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ cart, notes, address }),
            });
            const data = await res.json();
            if (!res.ok) {
                setPixError(data.error ?? "Erro ao gerar pagamento");
                setStage("address");
                return;
            }
            setOrderId(data.orderId);
            setPaymentId(String(data.paymentId));
            setQrCode(data.qr_code);
            setQrBase64(data.qr_code_base64);
            setFinalTotal(data.total);
        } catch {
            setPixError("Erro ao conectar ao servidor");
            setStage("address");
        } finally {
            setPixLoading(false);
        }
    }

    async function handleSimulate() {
        if (!paymentId) return;
        setSimulating(true);
        try {
            const res = await fetch("/api/webhook/simulate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentId, status: "approved" }),
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                setPaymentConfirmed(true);
                setStage("confirmation");
            }
        } catch {
            /* silent */
        } finally {
            setSimulating(false);
        }
    }

    async function handleCopy() {
        if (!qrCode) return;
        try { await navigator.clipboard.writeText(qrCode); } catch { /* fallback */ }
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    }

    if (!open) return null;

    const total = subtotal + deliveryFee;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={stage === "confirmation" ? undefined : onClose}
            />
            <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
                <div className="h-1.5 bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--primary)]" />

                {/* Step indicator */}
                {stage !== "confirmation" && (
                    <div className="flex items-center justify-center gap-2 pt-3 pb-1">
                        {(["address", "qr"] as Stage[]).map((s, i) => (
                            <div key={s} className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${stage === s ? "bg-[var(--primary)] text-white" : i < (stage === "qr" ? 1 : 0) ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>
                                    {i < (stage === "qr" ? 1 : 0) ? "✓" : i + 1}
                                </div>
                                {i < 1 && <div className="w-8 h-0.5 bg-slate-200" />}
                            </div>
                        ))}
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 flex items-center justify-center text-lg z-10"
                >
                    ×
                </button>

                <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                    {/* ── STEP 1: ADDRESS ── */}
                    {stage === "address" && (
                        <div className="p-6 space-y-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">📍 {t("addressStep")}</h3>

                            {/* Saved / New toggle */}
                            {savedAddress && (
                                <div className="flex rounded-xl overflow-hidden border border-slate-200">
                                    <button
                                        onClick={() => { setAddressMode("saved"); setAddress(savedAddress); setCepError(""); }}
                                        className={`flex-1 py-2 text-sm font-semibold transition ${addressMode === "saved" ? "bg-[var(--primary)] text-white" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                                    >
                                        ✅ {t("useSavedAddress")}
                                    </button>
                                    <button
                                        onClick={() => { setAddressMode("new"); setAddress(EMPTY_ADDRESS); setCepError(""); }}
                                        className={`flex-1 py-2 text-sm font-semibold transition ${addressMode === "new" ? "bg-[var(--primary)] text-white" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                                    >
                                        + {t("newAddress")}
                                    </button>
                                </div>
                            )}

                            {/* Saved address summary card */}
                            {savedAddress && addressMode === "saved" && (
                                <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-800">
                                    <p className="font-semibold">📍 {savedAddress.street} {savedAddress.number}</p>
                                    <p className="text-xs mt-0.5 text-emerald-600">{savedAddress.city} – {savedAddress.state} · {savedAddress.cep}</p>
                                </div>
                            )}

                            {/* Order summary */}
                            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 px-4 py-3 flex justify-between">
                                <div>
                                    <p className="text-[11px] uppercase tracking-wide text-slate-400">{t("subtotal")}</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatBRL(subtotal)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] uppercase tracking-wide text-slate-400">{t("shippingEstimate")}</p>
                                    <p className="text-sm font-bold text-[var(--primary)]">
                                        {address.state
                                            ? deliveryFee === 0 ? t("free") : formatBRL(deliveryFee)
                                            : t("shippingCalcAtCheckout")}
                                    </p>
                                </div>
                            </div>

                            {/* New address form */}
                            {addressMode === "new" && (
                                <>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{t("cepLabel")} *</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={address.cep}
                                                onChange={(e) => handleCepChange(e.target.value)}
                                                placeholder={t("cepPlaceholder")}
                                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]"
                                                maxLength={9}
                                            />
                                            {cepLoading && (
                                                <span className="absolute right-3 top-2.5 text-xs text-slate-400 animate-pulse">
                                                    {t("cepLoading")}
                                                </span>
                                            )}
                                        </div>
                                        {cepError && <p className="text-xs text-red-500 mt-1">{cepError}</p>}
                                    </div>

                                    {address.city && (
                                        <>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="col-span-2">
                                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{t("streetLabel")}</label>
                                                    <input
                                                        type="text"
                                                        value={address.street}
                                                        onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
                                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{t("numberLabel")} *</label>
                                                    <input
                                                        type="text"
                                                        value={address.number}
                                                        onChange={(e) => setAddress((a) => ({ ...a, number: e.target.value }))}
                                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]"
                                                        placeholder="123"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{t("complementLabel")}</label>
                                                <input
                                                    type="text"
                                                    value={address.complement}
                                                    onChange={(e) => setAddress((a) => ({ ...a, complement: e.target.value }))}
                                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]"
                                                    placeholder="Apto, bloco..."
                                                />
                                            </div>

                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="col-span-2">
                                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{t("cityLabel")}</label>
                                                    <input
                                                        type="text"
                                                        value={address.city}
                                                        onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{t("stateLabel")}</label>
                                                    <input
                                                        type="text"
                                                        value={address.state}
                                                        onChange={(e) => {
                                                            const v = e.target.value.toUpperCase().slice(0, 2);
                                                            setAddress((a) => ({ ...a, state: v }));
                                                        }}
                                                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)] uppercase"
                                                        maxLength={2}
                                                    />
                                                </div>
                                            </div>

                                            {/* Save as default checkbox */}
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={saveAsDefault}
                                                    onChange={(e) => setSaveAsDefault(e.target.checked)}
                                                    className="accent-[var(--primary)] w-4 h-4"
                                                />
                                                <span className="text-xs text-slate-500">{t("saveAsDefault")}</span>
                                            </label>
                                        </>
                                    )}
                                </>
                            )}

                            {pixError && <p className="text-xs text-red-500">{pixError}</p>}

                            <div className="border-t border-slate-100 dark:border-slate-700 pt-3 flex justify-between text-sm font-bold text-slate-900 dark:text-white">
                                <span>Total</span>
                                <span className="text-[var(--primary)]">{formatBRL(total)}</span>
                            </div>

                            <button
                                onClick={handleAddressNext}
                                disabled={(addressMode === "new" && (!address.city || cepLoading))}
                                className={`w-full rounded-xl px-4 py-3 font-bold text-white transition ${(addressMode === "new" && (!address.city || cepLoading))
                                    ? "bg-slate-300 cursor-not-allowed"
                                    : "bg-[var(--primary)] hover:bg-[var(--primary-dark)] shadow-lg shadow-purple-500/25"
                                    }`}
                            >
                                {t("continuePay")} →
                            </button>
                        </div>
                    )}

                    {/* ── STEP 2: QR CODE ── */}
                    {stage === "qr" && (
                        <div className="p-4">
                            {/* Header row */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-[#32BCAD]/10 flex items-center justify-center shrink-0">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                            <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="4" transform="rotate(45 12 12)" stroke="#32BCAD" strokeWidth="2.2" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{t("payTitle")}</h3>
                                        {user && <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{user.email}</p>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase tracking-wide text-slate-400">{t("payAmount")}</p>
                                    <p className="text-base font-extrabold text-[var(--primary)] leading-tight">{formatBRL(finalTotal || total)}</p>
                                </div>
                            </div>

                            {pixLoading ? (
                                <div className="flex flex-col items-center gap-2 py-6">
                                    <div className="w-8 h-8 rounded-full border-3 border-[var(--primary)] border-t-transparent animate-spin" />
                                    <p className="text-xs text-slate-400 animate-pulse">{t("pixLoading")}</p>
                                </div>
                            ) : qrBase64 ? (
                                <div className="flex gap-3 items-start">
                                    {/* QR code */}
                                    <div className="shrink-0 rounded-xl border border-[#32BCAD]/30 p-2 bg-white dark:bg-slate-800 shadow-sm">
                                        <img
                                            src={`data:image/png;base64,${qrBase64}`}
                                            alt="Pix QR Code"
                                            width={160}
                                            height={160}
                                            className="rounded-lg"
                                        />
                                    </div>
                                    {/* Right column */}
                                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{t("scanQr")}</p>
                                        {qrCode && (
                                            <>
                                                <p className="text-[10px] text-slate-400">{t("orCopy")}</p>
                                                <div className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1.5 text-[9px] font-mono text-slate-400 break-all line-clamp-3">
                                                    {qrCode}
                                                </div>
                                                <button
                                                    onClick={handleCopy}
                                                    className={`w-full rounded-xl px-3 py-2 text-xs font-semibold transition ${copied ? "bg-emerald-500 text-white" : "bg-[#32BCAD] hover:bg-[#2AA99B] text-white"}`}
                                                >
                                                    {copied ? t("copied") : t("copyCode")}
                                                </button>
                                            </>
                                        )}
                                        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 px-2 py-1.5">
                                            <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium animate-pulse text-center">
                                                ⏳ {t("awaitingPayment")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-sm text-slate-400 py-4">
                                    {pixError || t("pixLoading")}
                                </div>
                            )}

                            {/* Dev simulate button */}
                            {process.env.NODE_ENV !== "production" && paymentId && (
                                <button
                                    onClick={handleSimulate}
                                    disabled={simulating}
                                    className="mt-3 w-full rounded-xl border-2 border-dashed border-emerald-400 px-4 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"
                                >
                                    {simulating ? "Simulando..." : `🧪 ${t("simulatePay")}`}
                                </button>
                            )}

                            <p className="mt-3 text-center text-[10px] text-slate-400">{t("afterPay")}</p>
                            <button
                                onClick={() => setStage("confirmation")}
                                className="mt-2 w-full rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-dark)] px-4 py-2.5 font-bold text-sm text-white transition shadow-md shadow-purple-500/25"
                            >
                                {t("confirmPaid")}
                            </button>
                        </div>
                    )}

                    {/* ── STEP 3: CONFIRMATION ── */}
                    {stage === "confirmation" && (
                        <div className="p-8 text-center">
                            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl mb-4">
                                {paymentConfirmed ? "✅" : "🎉"}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t("successTitle")}</h3>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{t("successText")}</p>

                            {orderId && (
                                <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800 px-4 py-3 space-y-2">
                                    <div>
                                        <p className="text-xs text-slate-400">{t("orderNumber")}</p>
                                        <p className="font-mono font-bold text-[var(--primary)]">
                                            {orderId.substring(0, 8).toUpperCase()}
                                        </p>
                                    </div>
                                    {address.state && (
                                        <div>
                                            <p className="text-xs text-slate-400">{t("estimatedDelivery")}</p>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                🗓 {formatDeliveryRange(address.state, lang)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={() => onComplete(orderId ?? "")}
                                className="mt-4 w-full rounded-xl bg-[var(--secondary)] hover:bg-[var(--secondary-dark)] px-4 py-3 font-bold text-white transition"
                            >
                                📦 {t("viewOrder")}
                            </button>
                            <button
                                onClick={() => onComplete(orderId ?? "")}
                                className="mt-2 w-full rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 transition"
                            >
                                {t("backShop")}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
