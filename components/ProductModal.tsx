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

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
    const full = Math.round(rating);
    const cls = size === "lg" ? "text-2xl" : "text-sm";
    return (
        <span className={cls}>
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

    const avgRating = reviews.length > 0
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
        : null;

    const name = product.name[lang] ?? product.name.pt;
    const description = product.description[lang] ?? product.description.pt;

    return (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="h-1.5 bg-gradient-to-r from-[#9B2D8F] via-[#1CA8DD] to-[#9B2D8F]" />
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 shadow hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center text-lg"
                    aria-label="close"
                >
                    ×
                </button>

                <div className="flex-1 overflow-y-auto">
                    <div className="grid md:grid-cols-2">
                        <div className="relative bg-slate-50 dark:bg-slate-800 aspect-square md:aspect-auto md:min-h-[320px]">
                            <img src={product.image} alt={name} className="w-full h-full object-cover" />
                            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                                {product.popular && (
                                    <span className="rounded-full bg-[#9B2D8F] px-3 py-1 text-[11px] font-bold text-white shadow">
                                        ⭐ {t("popular")}
                                    </span>
                                )}
                                {product.customizable && (
                                    <span className="rounded-full bg-white dark:bg-slate-700 px-3 py-1 text-[11px] font-semibold text-[#1CA8DD] shadow">
                                        ✏️ {t("custom")}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="p-6 flex flex-col">
                            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">{name}</h2>

                            {avgRating !== null && (
                                <div className="mt-2 flex items-center gap-2">
                                    <Stars rating={avgRating} size="sm" />
                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                        {avgRating} ({reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"})
                                    </span>
                                </div>
                            )}

                            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed flex-1">{description}</p>

                            <div className="mt-6 flex items-center justify-between">
                                <span className="text-2xl font-extrabold text-[#9B2D8F]">{formatBRL(product.price)}</span>
                                <button
                                    onClick={() => {
                                        onAdd(product.id, () => {
                                            setJustAdded(true);
                                            setTimeout(() => setJustAdded(false), 1500);
                                        });
                                    }}
                                    className={`rounded-xl px-5 py-2.5 font-bold text-sm transition shadow-md ${justAdded
                                        ? "bg-emerald-500 text-white shadow-emerald-500/25"
                                        : "bg-[#9B2D8F] hover:bg-[#7A2270] text-white shadow-purple-500/25"
                                        }`}
                                >
                                    {justAdded ? t("added") : `+ ${t("addToCart")}`}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-5">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3">
                            {t("reviewsTitle2")}
                            {reviews.length > 0 && (
                                <span className="ml-2 text-sm font-normal text-slate-400">({reviews.length})</span>
                            )}
                        </h3>

                        {reviewsLoading && (
                            <div className="text-sm text-slate-400 animate-pulse py-4 text-center">Carregando avaliações...</div>
                        )}

                        {!reviewsLoading && reviews.length === 0 && (
                            <div className="text-center py-6">
                                <p className="text-2xl mb-1">💬</p>
                                <p className="text-sm text-slate-400">{t("noReviews")}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            {reviews.map((r) => (
                                <div key={r.id} className="rounded-xl bg-slate-50 dark:bg-slate-800 px-4 py-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-[#9B2D8F]/20 flex items-center justify-center text-xs font-bold text-[#9B2D8F]">
                                                {(r.userName ?? "?")[0].toUpperCase()}
                                            </div>
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{r.userName}</span>
                                        </div>
                                        <span className="text-amber-400 text-sm">
                                            {"★".repeat(r.rating)}
                                            <span className="text-slate-300 dark:text-slate-600">{"★".repeat(5 - r.rating)}</span>
                                        </span>
                                    </div>
                                    {r.comment && (
                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed ml-9">{r.comment}</p>
                                    )}
                                    <p className="text-[10px] text-slate-400 mt-1 ml-9">
                                        {new Date(r.createdAt).toLocaleDateString(
                                            lang === "pt" ? "pt-BR" : lang === "fr" ? "fr-FR" : "en-US"
                                        )}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
