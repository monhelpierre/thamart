import { useState } from "react";
import { useI18n, LANGS, type Lang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import type { AppUser } from "@/lib/firebase";
import { logOut } from "@/lib/firebase";

interface Props {
  cartCount: number;
  user: AppUser | null;
  onOpenCart: () => void;
  onOpenOrders?: () => void;
  onSignIn: () => void;
  onSignedOut: () => void;
  authLoading?: boolean;
}

export default function Header({
  cartCount,
  user,
  onOpenCart,
  onOpenOrders,
  onSignIn,
  onSignedOut,
  authLoading = false,
}: Props) {
  const { lang, setLang, t } = useI18n();
  const { theme, toggle } = useTheme();
  const [langOpen, setLangOpen] = useState(false);
  const current = LANGS.find((l) => l.code === lang)!;

  const handleSignOut = async () => {
    await logOut();
    onSignedOut();
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-3">
        <a href="#top" className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9B2D8F] to-[#1CA8DD] flex items-center justify-center text-xl shadow-md shadow-purple-500/30 shrink-0">
            📿
          </div>
          <div className="min-w-0 hidden xs:block sm:block">
            <p className="font-extrabold text-slate-900 dark:text-white leading-tight truncate">
              {t("brand")}
            </p>
            <p className="text-[11px] text-[#9B2D8F] font-medium leading-tight truncate">
              {t("tagline")}
            </p>
          </div>
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <a href="#menu" className="hover:text-[#9B2D8F] transition">{t("navMenu")}</a>
          <a href="#how" className="hover:text-[#9B2D8F] transition">{t("navHow")}</a>
          <a href="#about" className="hover:text-[#9B2D8F] transition">{t("navAbout")}</a>
        </nav>

        <div className="flex items-center gap-2 min-w-[160px] justify-end">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          >
            {theme === "dark" ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a1 1 0 011 1v1a1 1 0 01-2 0V3a1 1 0 011-1zm0 17a1 1 0 011 1v1a1 1 0 01-2 0v-1a1 1 0 011-1zm9-9a1 1 0 010 2h-1a1 1 0 010-2h1zM4 11a1 1 0 010 2H3a1 1 0 010-2h1zm14.657-5.657a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM7.05 16.95a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM18.657 16.95a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414zM7.05 7.05a1 1 0 01-1.414 0l-.707-.707A1 1 0 016.343 4.93l.707.707a1 1 0 010 1.414zM12 7a5 5 0 100 10A5 5 0 0012 7z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>

          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
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
                <div className="absolute right-0 mt-1.5 z-20 w-44 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLangOpen(false);
                        setLang(l.code as Lang);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 ${l.code === lang
                        ? "font-bold text-[#9B2D8F] bg-[#F3E0F0] dark:bg-[#9B2D8F]/20"
                        : "text-slate-600 dark:text-slate-300"
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
                <img
                  src={user?.photoURL ?? "/default-avatar.svg"}
                  alt={user.displayName ?? t("profileDefaultAlt") ?? "Profile"}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={handleSignOut}
                className="hidden sm:inline-flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-2 rounded-lg transition"
                aria-label={t("signOut")}
                title={t("signOut")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4M21 12H7" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8v8" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div
                className="w-8 h-8 rounded-full bg-[#9B2D8F] text-white text-xs font-bold flex items-center justify-center overflow-hidden"
                title=""
              >
                <img src="/default-avatar.svg" alt={t("profileDefaultAlt") || "Profile"} className="w-full h-full object-cover" />
              </div>
              <button
                onClick={onSignIn}
                className="hidden sm:inline-flex items-center justify-center rounded-lg p-2 text-[#9B2D8F] hover:bg-[#F3E0F0] dark:hover:bg-[#9B2D8F]/20 transition"
                aria-label={t("signIn")}
                title={t("signIn")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11c1.657 0 3-1.343 3-3S17.657 5 16 5s-3 1.343-3 3 1.343 3 3 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 21v-2a4 4 0 014-4h0a4 4 0 014 4v2" />
                </svg>
              </button>
            </div>
          )}

          {/* My Orders */}
          {user && onOpenOrders && (
            <button
              onClick={onOpenOrders}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              title={t("myOrders")}
            >
              📦 <span className="hidden md:inline">{t("myOrders")}</span>
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
