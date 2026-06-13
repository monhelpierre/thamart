import { useState } from "react";
import { useI18n, LANGS, type Lang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import type { AppUser } from "@/lib/firebase";
import { logOut } from "@/lib/firebase";
import { useSiteConfig } from "@/lib/siteConfig";

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
  const cfg = useSiteConfig();
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-xl shadow-md shadow-purple-500/30 shrink-0 overflow-hidden">
            {cfg.faviconUrl ? (
              <img src={cfg.faviconUrl} alt={cfg.brandName} className="w-full h-full object-cover" />
            ) : (
              "📿"
            )}
          </div>
          <div className="min-w-0 hidden xs:block sm:block">
            <p className="font-extrabold text-slate-900 dark:text-white leading-tight truncate">
              {cfg.brandName || t("brand")}
            </p>
            <p className="text-[11px] text-[var(--primary)] font-medium leading-tight truncate">
              {cfg.tagline || t("tagline")}
            </p>
          </div>
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <a href="#menu" className="hover:text-[var(--primary)] transition">{t("navMenu")}</a>
          <a href="#how" className="hover:text-[var(--primary)] transition">{t("navHow")}</a>
          <a href="#about" className="hover:text-[var(--primary)] transition">{t("navAbout")}</a>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2 justify-end min-w-0">
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
              className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <span>{current.flag}</span>
              <span className="hidden sm:inline uppercase text-xs">{current.code}</span>
              <span className="hidden sm:inline text-[10px] text-slate-400">▼</span>
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
                        ? "font-bold text-[var(--primary)] bg-[#F3E0F0] dark:bg-[var(--primary)]/20"
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
            <div className="flex items-center gap-1">
              <div
                className="w-8 h-8 rounded-full bg-[var(--primary)] text-white text-xs font-bold flex items-center justify-center overflow-hidden shrink-0"
                title={user.email}
              >
                <img
                  src={user?.photoURL ?? "/default-avatar.svg"}
                  alt={user.displayName ?? t("profileDefaultAlt") ?? "Profile"}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                aria-label={t("signOut")}
                title={t("signOut")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div
                className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 flex items-center justify-center overflow-hidden shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                </svg>
              </div>
              <button
                onClick={onSignIn}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--primary)] hover:bg-[#F3E0F0] dark:hover:bg-[var(--primary)]/20 transition"
                aria-label={t("signIn")}
                title={t("signIn")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}

          {/* My Orders */}
          {user && onOpenOrders && (
            <button
              onClick={onOpenOrders}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-2.5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              title={t("myOrders")}
            >
              📦 <span className="hidden md:inline">{t("myOrders")}</span>
            </button>
          )}

          {/* Cart */}
          <button
            onClick={onOpenCart}
            className="relative rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-dark)] px-2.5 sm:px-3.5 py-2 text-sm font-bold text-white transition shadow-md shadow-purple-500/25"
          >
            🛒 <span className="hidden sm:inline">{t("cart")}</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-[var(--accent)] text-[11px] font-bold text-white flex items-center justify-center shadow">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
