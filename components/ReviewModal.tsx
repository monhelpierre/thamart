"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { getAuthToken } from "@/lib/firebase";
import type { AppUser } from "@/lib/firebase";

interface Props {
    open: boolean;
    user: AppUser | null;
    orderId: string;
    productId: string;
    productName: string;
    onClose: () => void;
    onSubmitted: () => void;
}

export default function ReviewModal({ open, user, orderId, productId, productName, onClose, onSubmitted }: Props) {
    const { t } = useI18n();
    const [rating, setRating] = useState(0);
    const [hovered, setHovered] = useState(0);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    if (!open) return null;

    async function handleSubmit() {
        if (rating === 0) return;
        setSubmitting(true);
        setError("");
        try {
            const idToken = await getAuthToken();
            if (!idToken) return;
            const res = await fetch("/api/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ orderId, productId, rating, comment }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error === "already-reviewed" ? t("alreadyReviewed") : (data.error ?? "error"));
                return;
            }
            setDone(true);
            setTimeout(() => { onSubmitted(); onClose(); }, 1500);
        } catch {
            setError("server-error");
        } finally {
            setSubmitting(false);
        }
    }

    function handleClose() {
        setRating(0); setHovered(0); setComment(""); setDone(false); setError("");
        onClose();
    }

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--primary)]" />
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 text-xl flex items-center justify-center"
                >
                    ×
                </button>

                {done ? (
                    <div className="p-8 text-center">
                        <div className="text-4xl mb-3">⭐</div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{t("reviewSubmitted")}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("thanksReview") || "Obrigada pelo seu feedback!"}</p>
                    </div>
                ) : (
                    <div className="p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t("reviewTitle")}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">{productName}</p>

                        <div className="mt-4">
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">{t("ratingLabel")}</p>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHovered(star)}
                                        onMouseLeave={() => setHovered(0)}
                                        className="text-3xl transition-transform hover:scale-110"
                                    >
                                        <span className={star <= (hovered || rating) ? "text-amber-400" : "text-slate-200 dark:text-slate-600"}>
                                            ★
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t("commentLabel")}</label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value.slice(0, 500))}
                                rows={3}
                                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)] resize-none"
                                placeholder="Conte como foi sua experiência..."
                            />
                            <p className="text-right text-[10px] text-slate-400 mt-0.5">{comment.length}/500</p>
                        </div>

                        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

                        <button
                            onClick={handleSubmit}
                            disabled={rating === 0 || submitting}
                            className={`mt-4 w-full rounded-xl px-4 py-3 font-bold text-white transition ${rating === 0 || submitting
                                ? "bg-slate-300 dark:bg-slate-600 cursor-not-allowed"
                                : "bg-[var(--primary)] hover:bg-[var(--primary-dark)]"
                                }`}
                        >
                            {submitting ? "..." : t("submitReview")}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
