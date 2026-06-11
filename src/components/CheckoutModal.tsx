import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { useI18n } from "../i18n";
import { formatBRL } from "../data/products";
import { buildPixPayload, makeTxid } from "../lib/pix";
import {
  signInWithGoogle,
  firebaseDemoMode,
  type AppUser,
} from "../lib/firebase";

interface Props {
  open: boolean;
  total: number;
  user: AppUser | null;
  onUser: (u: AppUser) => void;
  onClose: () => void;
  onComplete: () => void;
}

type Stage = "login" | "pix" | "done";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  );
}

export default function CheckoutModal({
  open,
  total,
  user,
  onUser,
  onClose,
  onComplete,
}: Props) {
  const { t } = useI18n();
  const [stage, setStage] = useState<Stage>("login");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const txid = useMemo(() => makeTxid(), [open]);
  const pixCode = useMemo(() => buildPixPayload(total, txid), [total, txid]);

  useEffect(() => {
    if (open) {
      setStage(user ? "pix" : "login");
      setCopied(false);
    }
  }, [open, user]);

  useEffect(() => {
    if (stage === "pix" && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, pixCode, {
        width: 220,
        margin: 1,
        color: { dark: "#0B1220", light: "#FFFFFF" },
      });
    }
  }, [stage, pixCode]);

  if (!open) return null;

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const u = await signInWithGoogle();
      onUser(u);
      setStage("pix");
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
    } catch {
      /* fallback below */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={stage === "done" ? undefined : onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[#9B2D8F] via-[#1CA8DD] to-[#9B2D8F]" />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-lg"
          aria-label="close"
        >
          ×
        </button>

        {stage === "login" && (
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-[#F3E0F0] flex items-center justify-center text-3xl mb-4">
              🔐
            </div>
            <h3 className="text-xl font-bold text-slate-900">{t("loginTitle")}</h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              {t("loginText")}
            </p>
            <button
              onClick={handleGoogle}
              disabled={busy}
              className="mt-6 w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-sm disabled:opacity-60"
            >
              <GoogleIcon />
              {busy ? t("signingIn") : t("continueGoogle")}
            </button>
            {firebaseDemoMode && (
              <p className="mt-4 text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                ⚠️ {t("demoNotice")}
              </p>
            )}
          </div>
        )}

        {stage === "pix" && (
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#32BCAD]/10 flex items-center justify-center">
                {/* Pix logo-ish diamond */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="4.2"
                    y="4.2"
                    width="15.6"
                    height="15.6"
                    rx="4"
                    transform="rotate(45 12 12)"
                    stroke="#32BCAD"
                    strokeWidth="2.2"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{t("payTitle")}</h3>
                {user && (
                  <p className="text-xs text-slate-500">{user.email}</p>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  {t("payOrder")}
                </p>
                <p className="text-xs font-mono text-slate-600">{txid}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  {t("payAmount")}
                </p>
                <p className="text-lg font-extrabold text-[#9B2D8F]">
                  {formatBRL(total)}
                </p>
              </div>
            </div>

            <p className="mt-4 text-center text-sm font-medium text-slate-600">
              {t("scanQr")}
            </p>
            <div className="mt-2 flex justify-center">
              <div className="rounded-2xl border-2 border-[#32BCAD]/40 p-3 bg-white shadow-sm">
                <canvas ref={canvasRef} />
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-slate-400">{t("orCopy")}</p>
            <div className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-mono text-slate-500 break-all max-h-16 overflow-y-auto">
              {pixCode}
            </div>
            <button
              onClick={handleCopy}
              className={`mt-3 w-full rounded-xl px-4 py-2.5 font-semibold transition ${
                copied
                  ? "bg-emerald-500 text-white"
                  : "bg-[#32BCAD] hover:bg-[#2AA99B] text-white"
              }`}
            >
              {copied ? t("copied") : t("copyCode")}
            </button>

            <p className="mt-4 text-center text-xs text-slate-400">{t("afterPay")}</p>
            <button
              onClick={() => setStage("done")}
              className="mt-2 w-full rounded-xl bg-[#9B2D8F] hover:bg-[#7A2270] px-4 py-3 font-bold text-white transition shadow-md shadow-purple-500/25"
            >
              {t("confirmPaid")}
            </button>
          </div>
        )}

        {stage === "done" && (
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl mb-4">
              ✅
            </div>
            <h3 className="text-xl font-bold text-slate-900">{t("successTitle")}</h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              {t("successText")}
            </p>
            <button
              onClick={onComplete}
              className="mt-6 w-full rounded-xl bg-[#9B2D8F] hover:bg-[#7A2270] px-4 py-3 font-bold text-white transition"
            >
              {t("backShop")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
