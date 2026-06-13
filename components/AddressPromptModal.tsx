"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { getAuthToken } from "@/lib/firebase";
import { lookupCep } from "@/lib/shipping";
import type { AppUser } from "@/lib/firebase";

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
    user: AppUser | null;
    onSaved: (address: AddressState) => void;
    onSkip: () => void;
}

const EMPTY: AddressState = {
    cep: "", street: "", number: "", complement: "",
    neighborhood: "", city: "", state: "", country: "BR",
};

export default function AddressPromptModal({ open, user, onSaved, onSkip }: Props) {
    const { t } = useI18n();
    const [address, setAddress] = useState<AddressState>(EMPTY);
    const [cepLoading, setCepLoading] = useState(false);
    const [cepError, setCepError] = useState("");
    const [saving, setSaving] = useState(false);

    if (!open) return null;

    async function handleCepChange(value: string) {
        const formatted = value.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2").slice(0, 9);
        setAddress((a) => ({ ...a, cep: formatted }));
        setCepError("");
        const digits = formatted.replace(/\D/g, "");
        if (digits.length === 8) {
            setCepLoading(true);
            const result = await lookupCep(digits);
            setCepLoading(false);
            if (result.ok) {
                setAddress((a) => ({ ...a, street: result.street, neighborhood: result.neighborhood, city: result.city, state: result.state, cep: result.cep }));
            } else {
                setCepError(t("cepNotFound"));
            }
        }
    }

    async function handleSave() {
        if (!address.city || !address.state || !address.number.trim()) {
            setCepError(!address.city ? t("cepNotFound") : "Informe o número");
            return;
        }
        setSaving(true);
        try {
            const idToken = await getAuthToken();
            if (!idToken) return;
            await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ uid: user?.uid, displayName: user?.displayName, email: user?.email, photoURL: user?.photoURL, defaultAddress: address }),
            });
            onSaved(address);
        } catch {
            onSkip();
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[72] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onSkip} />
            <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
                <div className="h-1.5 bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--primary)]" />
                <button
                    onClick={onSkip}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 flex items-center justify-center text-lg z-10"
                >
                    ×
                </button>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="text-center">
                        <div className="mx-auto w-14 h-14 rounded-2xl bg-[#F3E0F0] dark:bg-[var(--primary)]/20 flex items-center justify-center text-3xl mb-3">
                            📍
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t("addYourAddress")}</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{t("addressPromptText")}</p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{t("cepLabel")} *</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={address.cep}
                                onChange={(e) => handleCepChange(e.target.value)}
                                placeholder={t("cepPlaceholder")}
                                maxLength={9}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]"
                            />
                            {cepLoading && (
                                <span className="absolute right-3 top-2.5 text-xs text-slate-400 animate-pulse">{t("cepLoading")}</span>
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
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{t("numberLabel")} *</label>
                                    <input
                                        type="text"
                                        value={address.number}
                                        onChange={(e) => setAddress((a) => ({ ...a, number: e.target.value }))}
                                        placeholder="123"
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{t("complementLabel")}</label>
                                <input
                                    type="text"
                                    value={address.complement}
                                    onChange={(e) => setAddress((a) => ({ ...a, complement: e.target.value }))}
                                    placeholder="Apto, bloco..."
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]"
                                />
                            </div>

                            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300">
                                📍 {address.street} — {address.city}, {address.state} · {address.cep}
                            </div>
                        </>
                    )}
                </div>

                <div className="px-6 pb-6 pt-2 space-y-2">
                    <button
                        onClick={handleSave}
                        disabled={saving || cepLoading || !address.city}
                        className="w-full rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-dark)] px-4 py-3 font-bold text-white transition disabled:opacity-50"
                    >
                        {saving ? "Salvando..." : t("saveAddress")}
                    </button>
                    <button
                        onClick={onSkip}
                        className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 transition"
                    >
                        {t("skipForNow")}
                    </button>
                </div>
            </div>
        </div>
    );
}
