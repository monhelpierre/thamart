"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { getAuthToken } from "@/lib/firebase";
import { formatBRL } from "@/data/products";
import { formatDeliveryRange } from "@/lib/shipping";
import type { AppUser } from "@/lib/firebase";
import ChatModal from "@/components/ChatModal";

type OrderStatus = "pending_payment" | "paid" | "in_production" | "shipped" | "delivered";

interface OrderItem {
    productId: string;
    name: { pt: string; fr: string; en: string };
    qty: number;
    price: number;
}

export interface Order {
    id: string;
    items: OrderItem[];
    subtotal: number;
    deliveryFee: number;
    total: number;
    notes: string;
    address: { cep: string; street: string; number: string; city: string; state: string };
    status: OrderStatus;
    paymentId: string | null;
    trackingCode?: string;
    createdAt: string;
    updatedAt: string;
}

interface Props {
    open: boolean;
    user: AppUser | null;
    highlightOrderId?: string | null;
    onClose: () => void;
    onReview: (orderId: string, productId: string) => void;
}

const STATUS_ORDER: OrderStatus[] = [
    "pending_payment", "paid", "in_production", "shipped", "delivered",
];

export default function OrderTrackerModal({ open, user, highlightOrderId, onClose, onReview }: Props) {
    const { t, lang } = useI18n();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [chatOrderId, setChatOrderId] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !user) return;
        setExpandedId(highlightOrderId ?? null);
        fetchOrders();
    }, [open, user]);

    useEffect(() => {
        if (highlightOrderId) setExpandedId(highlightOrderId);
    }, [highlightOrderId]);

    async function fetchOrders() {
        if (!user) return;
        setLoading(true);
        try {
            const idToken = await getAuthToken();
            if (!idToken) return;
            const res = await fetch(`/api/orders?uid=${encodeURIComponent(user.uid)}`, {
                headers: { Authorization: `Bearer ${idToken}` },
            });
            const data = await res.json();
            if (Array.isArray(data)) setOrders(data);
        } catch (e) {
            console.error("fetch orders error", e);
        } finally {
            setLoading(false);
        }
    }

    const statusKey: Record<OrderStatus, string> = {
        pending_payment: "statusPendingPayment",
        paid: "statusPaid",
        in_production: "statusInProduction",
        shipped: "statusShipped",
        delivered: "statusDelivered",
    };

    const statusIcon: Record<OrderStatus, string> = {
        pending_payment: "⏳",
        paid: "✅",
        in_production: "🔨",
        shipped: "🚚",
        delivered: "📦",
    };

    if (!open) return null;

    return (
        <>
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg max-h-[90vh] rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
                <div className="h-1.5 bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--primary)]" />
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">📦 {t("myOrders")}</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 text-xl flex items-center justify-center"
                    >
                        ×
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {loading && (
                        <div className="text-center py-10 text-slate-400 text-sm animate-pulse">Carregando...</div>
                    )}
                    {!loading && orders.length === 0 && (
                        <div className="text-center py-10">
                            <p className="text-4xl mb-2">🛍️</p>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">{t("noOrders")}</p>
                        </div>
                    )}
                    {orders.map((order) => {
                        const isExpanded = expandedId === order.id;
                        const stepIndex = STATUS_ORDER.indexOf(order.status);
                        const date = order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString(
                                lang === "pt" ? "pt-BR" : lang === "fr" ? "fr-FR" : "en-US"
                            )
                            : "";

                        return (
                            <div key={order.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <button
                                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition text-left"
                                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                                >
                                    <div>
                                        <p className="text-xs font-mono text-slate-400">
                                            {t("orderNumber")}{order.id.substring(0, 8).toUpperCase()}
                                        </p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                            {statusIcon[order.status]} {t(statusKey[order.status])}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400">{date}</p>
                                        <p className="text-sm font-bold text-[var(--primary)]">{formatBRL(order.total)}</p>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="px-4 py-4 space-y-4 bg-white dark:bg-slate-900">
                                        {/* Progress stepper */}
                                        <div className="flex items-center gap-0">
                                            {STATUS_ORDER.map((s, i) => {
                                                const done = i <= stepIndex;
                                                const active = i === stepIndex;
                                                return (
                                                    <div key={s} className="flex-1 flex flex-col items-center">
                                                        <div className="flex items-center w-full">
                                                            {i > 0 && (
                                                                <div className={`flex-1 h-0.5 ${i <= stepIndex ? "bg-[var(--primary)]" : "bg-slate-200 dark:bg-slate-700"}`} />
                                                            )}
                                                            <div
                                                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${done
                                                                    ? "bg-[var(--primary)] border-[var(--primary)] text-white"
                                                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-400"
                                                                    } ${active ? "ring-2 ring-[var(--primary)]/30 scale-110" : ""}`}
                                                            >
                                                                {done ? (active ? statusIcon[s] : "✓") : i + 1}
                                                            </div>
                                                            {i < STATUS_ORDER.length - 1 && (
                                                                <div className={`flex-1 h-0.5 ${i < stepIndex ? "bg-[var(--primary)]" : "bg-slate-200 dark:bg-slate-700"}`} />
                                                            )}
                                                        </div>
                                                        <p className={`text-[9px] mt-1 text-center leading-tight ${active ? "font-bold text-[var(--primary)]" : done ? "text-slate-600 dark:text-slate-300" : "text-slate-400"}`}>
                                                            {t(statusKey[s])}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {["paid", "in_production", "shipped"].includes(order.status) && order.address?.state && (
                                            <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 px-3 py-2">
                                                <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">{t("estimatedDelivery")}</p>
                                                <p className="text-sm font-bold text-purple-800 dark:text-purple-300">
                                                    🗓 {formatDeliveryRange(order.address.state, lang)}
                                                </p>
                                            </div>
                                        )}

                                        {order.trackingCode && (
                                            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 px-3 py-2">
                                                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{t("trackingCode")}</p>
                                                {/^https?:\/\//.test(order.trackingCode) ? (
                                                    <a
                                                        href={order.trackingCode}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm font-semibold text-blue-700 dark:text-blue-300 hover:underline break-all"
                                                    >
                                                        🚚 Rastrear entrega →
                                                    </a>
                                                ) : (
                                                    <p className="font-mono text-sm text-blue-800 dark:text-blue-300 break-all">{order.trackingCode}</p>
                                                )}
                                            </div>
                                        )}

                                        <div className="space-y-1.5">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between text-sm">
                                                    <span className="text-slate-700 dark:text-slate-300">
                                                        {item.name?.[lang as "pt" | "fr" | "en"] ?? item.name?.pt} ×{item.qty}
                                                    </span>
                                                    <span className="text-slate-500 dark:text-slate-400">{formatBRL(item.price * item.qty)}</span>
                                                </div>
                                            ))}
                                            <div className="border-t border-slate-100 dark:border-slate-700 pt-1 flex justify-between text-sm font-bold text-slate-800 dark:text-slate-200">
                                                <span>Total</span>
                                                <span className="text-[var(--primary)]">{formatBRL(order.total)}</span>
                                            </div>
                                        </div>

                                        {order.address && (
                                            <p className="text-xs text-slate-400">
                                                📍 {order.address.street} {order.address.number}, {order.address.city} – {order.address.state} · {order.address.cep}
                                            </p>
                                        )}

                                        {/* Chat with ThamArt */}
                                        {["paid", "in_production", "shipped", "delivered"].includes(order.status) && (
                                            <button
                                                onClick={() => setChatOrderId(order.id)}
                                                className="w-full rounded-xl border border-[#9B2D8F]/30 bg-[#F3E0F0] dark:bg-[#9B2D8F]/10 hover:bg-[#E9CCE5] dark:hover:bg-[#9B2D8F]/20 px-3 py-2.5 text-sm font-semibold text-[#9B2D8F] transition flex items-center gap-2"
                                            >
                                                💬 Falar com a ThamArt sobre este pedido
                                            </button>
                                        )}

                                        {order.status === "delivered" && (
                                            <div className="space-y-1.5">
                                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t("leaveReview")}</p>
                                                {order.items.map((item, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => onReview(order.id, item.productId)}
                                                        className="w-full text-left rounded-lg bg-[#F3E0F0] dark:bg-[var(--primary)]/20 hover:bg-[#E9CCE5] dark:hover:bg-[var(--primary)]/30 px-3 py-2 text-sm font-semibold text-[var(--primary)] transition"
                                                    >
                                                        ⭐ {item.name?.[lang as "pt" | "fr" | "en"] ?? item.name?.pt}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
        <ChatModal
            open={chatOrderId !== null}
            orderId={chatOrderId ?? ""}
            orderShortId={chatOrderId?.slice(0, 8).toUpperCase()}
            user={user}
            onClose={() => setChatOrderId(null)}
        />
        </>
    );
}
