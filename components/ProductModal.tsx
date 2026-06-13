"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { formatBRL, type Product } from "@/data/products";

interface Review {
    id: string;
    userId: string;
    userName: string;
    rating: number;
    comment?: string;
    createdAt: string;
}

interface Props {
    product: Product | null;
    open: boolean;
    onClose: () => void;
    onAdd: (id: string, onAdded: () => void) => void;
}

const DEFAULT_REVIEWS: Omit<Review, "userId">[] = [
    { id: "d1", userName: "Maria S.", rating: 5, comment: "Pulseira linda! Superou minhas expectativas. Chegou muito bem embalada.", createdAt: "2025-11-10T00:00:00Z" },
    { id: "d2", userName: "Ana P.", rating: 5, comment: "Produto de qualidade, entrega rápida. Recomendo!", createdAt: "2025-12-03T00:00:00Z" },
];

function Stars({ rating }: { rating: number }) {
    const full = Math.round(rating);
    return (
        <span className="text-amber-400 text-sm leading-none">
            {"★".repeat(full)}
            <span className="text-slate-300 dark:text-slate-600">{"★".repeat(5 - full)}</span>
        </span>
    );
}

export default function ProductModal({ product, open, onClose, onAdd }: Props) {
    const { t, lang } = useI18n();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [justAdded, setJustAdded] = useState(false);

    useEffect(() => {
        if (!open || !product) return;
        setReviews([]);
        setJustAdded(false);
        setReviewsLoading(true);
        fetch(`/api/reviews?productId=${product.id}`)
            .then((r) => r.json())
            .then((data) => setReviews(Array.isArray(data) ? data : []))
            .catch(() => setReviews([]))
            .finally(() => setReviewsLoading(false));
    }, [open, product]);

    if (!open || !product) return null;

    const displayReviews = reviews.length > 0 ? reviews : (DEFAULT_REVIEWS as Review[]);
    const isDefault = reviews.length === 0 && !reviewsLoading;
    const avgRating = displayReviews.length > 0
        ? Math.round((displayReviews.reduce((s, r) => s + r.rating, 0) / displayReviews.length) * 10) / 10
        : null;

    const name = product.name[lang] ?? product.name.pt;
    const description = product.description[lang] ?? product.description.pt;

    return (
        <div className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="h-1 bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--primary)]" />

                {/* Mobile drag handle */}
                <div className="sm:hidden flex justify-center pt-2 pb-0">
                    <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-white/90 dark:bg-slate-800/90 shadow hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center text-base"
                    aria-label="close"
                >
                    ×
                </button>

                {/* Image + info row */}
                <div className="flex gap-0 sm:gap-4 items-stretch">
                    <div className="hidden sm:block w-40 shrink-0 bg-slate-50 dark:bg-slate-800 rounded-bl-none overflow-hidden">
                        <img src={product.image} alt={name} className="w-full h-full object-cover" style={{ minHeight: 160 }} />
                    </div>

                    {/* Mobile image - full width, shorter */}
                    <div className="sm:hidden w-full h-44 bg-slate-50 dark:bg-slate-800 overflow-hidden relative">
                        <img src={product.image} alt={name} className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 flex gap-1">
                            {product.popular && (
                                <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-[10px] font-bold text-white shadow">⭐ {t("popular")}</span>
                            )}
                            {product.customizable && (
                                <span className="rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-[var(--secondary)] shadow">✏️ {t("custom")}</span>
                            )}
                        </div>
                    </div>

                    <div className="hidden sm:flex flex-col p-4 flex-1 min-w-0">
                        <div className="flex gap-1 mb-1">
                            {product.popular && (
                                <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-[10px] font-bold text-white">⭐ {t("popular")}</span>
                            )}
                            {product.customizable && (
                                <span className="rounded-full bg-[#EBF8FF] dark:bg-[var(--secondary)]/20 px-2 py-0.5 text-[10px] font-semibold text-[var(--secondary)]">✏️ {t("custom")}</span>
                            )}
                        </div>
                        <h2 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">{name}</h2>
                        {avgRating !== null && (
                            <div className="mt-1 flex items-center gap-1.5">
                                <Stars rating={avgRating} />
                                <span className="text-xs text-slate-400">{avgRating} ({displayReviews.length})</span>
                            </div>
                        )}
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex-1 line-clamp-3">{description}</p>
                        <div className="mt-3 flex items-center justify-between">
                            <span className="text-xl font-extrabold text-[var(--primary)]">{formatBRL(product.price)}</span>
                            <button
                                onClick={() => onAdd(product.id, () => { setJustAdded(true); setTimeout(() => setJustAdded(false), 1500); })}
                                className={`rounded-xl px-4 py-2 font-bold text-sm transition shadow-md ${justAdded ? "bg-emerald-500 text-white" : "bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white"}`}
                            >
                                {justAdded ? t("added") : `+ ${t("addToCart")}`}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile: name + add to cart bar */}
                <div className="sm:hidden px-4 py-3 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="min-w-0">
                        <h2 className="font-extrabold text-slate-900 dark:text-white text-sm leading-tight truncate">{name}</h2>
                        {avgRating !== null && (
                            <div className="flex items-center gap-1 mt-0.5">
                                <Stars rating={avgRating} />
                                <span className="text-[10px] text-slate-400">{avgRating} ({displayReviews.length})</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-lg font-extrabold text-[var(--primary)]">{formatBRL(product.price)}</span>
                        <button
                            onClick={() => onAdd(product.id, () => { setJustAdded(true); setTimeout(() => setJustAdded(false), 1500); })}
                            className={`rounded-xl px-3 py-2 font-bold text-xs transition ${justAdded ? "bg-emerald-500 text-white" : "bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white"}`}
                        >
                            {justAdded ? "✓" : "+"}
                        </button>
                    </div>
                </div>

                {/* Description (mobile only) */}
                <div className="sm:hidden px-4 py-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{description}</p>
                </div>

                {/* Reviews */}
                <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {t("reviewsTitle2")}
                        </h3>
                        {isDefault && (
                            <span className="text-[10px] text-slate-400 italic">Avaliações de exemplo</span>
                        )}
                    </div>

                    {reviewsLoading && (
                        <div className="text-xs text-slate-400 animate-pulse py-3 text-center">Carregando...</div>
                    )}

                    <div className="space-y-2">
                        {displayReviews.map((r) => (
                            <div key={r.id} className="rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2.5 flex gap-2.5">
                                <div className="w-6 h-6 shrink-0 rounded-full bg-[var(--primary)]/15 flex items-center justify-center text-[10px] font-bold text-[var(--primary)]">
                                    {(r.userName ?? "?")[0].toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{r.userName}</span>
                                        <Stars rating={r.rating} />
                                    </div>
                                    {r.comment && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{r.comment}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
