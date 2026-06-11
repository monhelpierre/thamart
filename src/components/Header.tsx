import { useState } from "react";
import { useI18n, LANGS, type Lang } from "../i18n";
import type { AppUser } from "../lib/firebase";
import { signOut } from "../lib/firebase";

interface Props {
  cartCount: number;
  user: AppUser | null;
  onOpenCart: () => void;
  onSignIn: () => void;
  onSignedOut: () => void;
}

export default function Header({
  cartCount,
  user,
  onOpenCart,
  onSignIn,
  onSignedOut,
}: Props) {
  const { lang, setLang, t } = useI18n();
  const [langOpen, setLangOpen] = useState(false);
  const current = LANGS.find((l) => l.code === lang)!;

  const handleSignOut = async () => {
    await signOut();
    onSignedOut();
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-3">
        <a href="#top" className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9B2D8F] to-[#1CA8DD] flex items-center justify-center text-xl shadow-md shadow-purple-500/30 shrink-0">
            📿
          </div>
          <div className="min-w-0 hidden xs:block sm:block">
            <p className="font-extrabold text-slate-900 leading-tight truncate">
              {t("brand")}
            </p>
            <p className="text-[11px] text-[#9B2D8F] font-medium leading-tight truncate">
              {t("tagline")}
            </p>
          </div>
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
          <a href="#menu" className="hover:text-[#9B2D8F] transition">{t("navMenu")}</a>
          <a href="#how" className="hover:text-[#9B2D8F] transition">{t("navHow")}</a>
          <a href="#about" className="hover:text-[#9B2D8F] transition">{t("navAbout")}</a>
        </nav>

        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              <span>{current.flag}</span>
              <span className="hidden sm:inline uppercase">{current.code}</span>
              <span className="text-[10px] text-slate-400">▼</span>
            </button>
            {langOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setLangOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 z-20 w-44 rounded-xl bg-white shadow-xl border border-slate-100 overflow-hidden">
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLang(l.code as Lang);
                        setLangOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-slate-50 ${
                        l.code === lang
                          ? "font-bold text-[#9B2D8F] bg-[#F3E0F0]"
                          : "text-slate-600"
                      }`}
                    >
                      <span>{l.flag}</span> {l.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Auth */}
          {user ? (
            <div className="flex items-center gap-1.5">
              <div
                className="w-8 h-8 rounded-full bg-[#9B2D8F] text-white text-xs font-bold flex items-center justify-center overflow-hidden"
                title={user.email}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  user.displayName
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="hidden sm:block text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                {t("signOut")}
              </button>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              className="hidden sm:block rounded-lg px-3 py-1.5 text-sm font-semibold text-[#9B2D8F] hover:bg-[#F3E0F0] transition"
            >
              {t("signIn")}
            </button>
          )}

          {/* Cart */}
          <button
            onClick={onOpenCart}
            className="relative rounded-xl bg-[#9B2D8F] hover:bg-[#7A2270] px-3.5 py-2 text-sm font-bold text-white transition shadow-md shadow-purple-500/25"
          >
            🛒 <span className="hidden sm:inline">{t("cart")}</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-[#F3425F] text-[11px] font-bold text-white flex items-center justify-center shadow">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
