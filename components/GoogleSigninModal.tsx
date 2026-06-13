"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { signInWithGoogle, type AppUser } from "@/lib/firebase";
import { TERMS_URL, PRIVACY_URL } from "@/data/products";

interface Props {
    open: boolean;
    onUser: (u: AppUser) => void;
    onClose: () => void;
}

function GoogleIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
        </svg>
    );
}

export default function GoogleSigninModal({ open, onUser, onClose }: Props) {
    const { t } = useI18n();
    const [busy, setBusy] = useState(false);

    if (!open) return null;

    const handleGoogle = async () => {
        setBusy(true);
        try {
            const u = await signInWithGoogle();
            onUser(u);
        } catch (e) {
            console.error(e);
        } finally {
            setBusy(false);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--primary)]" />
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 flex items-center justify-center text-lg"
                    aria-label="close"
                >
                    ×
                </button>

                <div className="p-8 text-center">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-[#F3E0F0] dark:bg-[var(--primary)]/20 flex items-center justify-center text-3xl mb-4">
                        🔐
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t("loginTitle")}</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{t("loginText")}</p>
                    <button
                        onClick={handleGoogle}
                        disabled={busy}
                        className="mt-6 w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition shadow-sm disabled:opacity-60"
                    >
                        <GoogleIcon />
                        {busy ? t("signingIn") : t("continueGoogle")}
                    </button>

                    <p className="mt-4 text-center text-[11px] text-slate-400 leading-relaxed px-2">
                        {t("termsNotice")}{" "}
                        {TERMS_URL ? (
                            <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="underline text-[var(--primary)] hover:text-[var(--primary-dark)] transition">
                                {t("termsLink")}
                            </a>
                        ) : (
                            <span className="underline text-slate-500">{t("termsLink")}</span>
                        )}{" "}
                        {t("andWord")}{" "}
                        {PRIVACY_URL ? (
                            <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="underline text-[var(--primary)] hover:text-[var(--primary-dark)] transition">
                                {t("privacyLink")}
                            </a>
                        ) : (
                            <span className="underline text-slate-500">{t("privacyLink")}</span>
                        )}.
                    </p>
                </div>
            </div>
        </div>
    );
}
