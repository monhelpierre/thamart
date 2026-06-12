import { useState, useEffect, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { FACEBOOK_URL, INSTAGRAM_URL, formatBRL, type Product } from "@/data/products";

/* ---------------- Hero ---------------- */
export function Hero() {
  const { t } = useI18n();
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#9B2D8F] via-[#7A2270] to-[#4A1559]" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 28%, #1CA8DD 0, transparent 38%), radial-gradient(circle at 82% 72%, #D14FBF 0, transparent 40%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
        <div className="text-white">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-4 py-1.5 text-xs font-bold uppercase tracking-wider">
            ✨ {t("heroBadge")}
          </span>
          <h1 className="mt-5 text-4xl md:text-5xl font-extrabold leading-tight">
            {t("heroTitle")}
          </h1>
          <p className="mt-4 text-purple-100 text-lg leading-relaxed max-w-lg">
            {t("heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#menu"
              className="rounded-xl bg-[#1CA8DD] px-6 py-3.5 font-bold text-white hover:bg-[#1593C2] transition shadow-xl shadow-cyan-900/30"
            >
              {t("heroCta")} →
            </a>
            <a
              href="#how"
              className="rounded-xl border-2 border-white/40 px-6 py-3.5 font-bold text-white hover:bg-white/10 transition"
            >
              {t("heroCta2")}
            </a>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            {[
              ["+3.000", t("statOrders")],
              ["30+", t("statDishes")],
              ["💜 100%", t("statCommunity")],
            ].map(([v, l]) => (
              <div key={l} className="rounded-xl bg-white/10 backdrop-blur px-3 py-3 text-center">
                <p className="text-xl font-extrabold">{v}</p>
                <p className="text-[11px] text-purple-100 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-3 rounded-3xl bg-white/10 backdrop-blur-sm rotate-2" />
          <img
            src="/bracelet-flower.jpg"
            alt="ThamArt beaded bracelets"
            className="relative rounded-2xl shadow-2xl w-full object-cover aspect-[4/3]"
          />
          {/* Pix payment badge removed from hero; payments are handled in checkout only */}
        </div>
      </div>
    </section>
  );
}

interface MenuProps {
  products: Product[];
  onAdd: (id: string, onAdded: () => void) => void;
  onProductClick?: (product: Product) => void;
  isLoading?: boolean;
}

export function Menu({ products, onAdd, onProductClick, isLoading = false }: MenuProps) {
  const { t, lang } = useI18n();
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});

  useEffect(() => {
    if (!products.length) return;
    Promise.all(
      products.map((p) =>
        fetch(`/api/reviews?productId=${p.id}`)
          .then((r) => r.json())
          .then((reviews) => ({ id: p.id, reviews: Array.isArray(reviews) ? reviews : [] }))
          .catch(() => ({ id: p.id, reviews: [] }))
      )
    ).then((results) => {
      const map: Record<string, { avg: number; count: number }> = {};
      results.forEach(({ id, reviews }) => {
        if (reviews.length > 0) {
          const avg = reviews.reduce((s: number, r: any) => s + (r.rating ?? 0), 0) / reviews.length;
          map[id] = { avg: Math.round(avg * 10) / 10, count: reviews.length };
        }
      });
      setRatings(map);
    });
  }, [products]);

  // Search & filters
  const [query, setQuery] = useState("");
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  const maxAvailable = useMemo(() => {
    if (!products || products.length === 0) return 1;
    return Math.max(1, ...products.map((p) => Math.floor(Number(p.price ?? 0))));
  }, [products]);


  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(6);

  const handleAdd = (id: string) => {
    onAdd(id, () => {
      setJustAdded(id);
      setTimeout(() => setJustAdded((v) => (v === id ? null : v)), 1200);
    });
  };

  // Reset page when filters/search change
  useEffect(() => setPage(1), [query, minPrice, maxPrice, pageSize, products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minPrice;
    const max = maxPrice;

    return products.filter((p) => {
      // search by localized name
      const name = (p.name[lang] ?? Object.values(p.name)[0] ?? "").toLowerCase();
      const matchesQuery = q === "" || name.includes(q);

      const price = Math.floor(Number(p.price ?? 0));
      const matchesMin = min === null ? true : price >= min;
      const matchesMax = max === null ? true : price <= max;

      return matchesQuery && matchesMin && matchesMax;
    });
  }, [products, query, minPrice, maxPrice, lang]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageIndex = Math.min(Math.max(1, page), totalPages);
  const paginated = filtered.slice((pageIndex - 1) * pageSize, pageIndex * pageSize);

  return (
    <section id="menu" className="mx-auto max-w-6xl px-4 py-16 md:py-20">
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-sm font-bold uppercase tracking-widest text-[#9B2D8F]">
          📿 {t("navMenu")}
        </p>
        <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
          {t("menuTitle")}
        </h2>
        <p className="mt-3 text-slate-500 dark:text-slate-400">{t("menuSubtitle")}</p>
      </div>

      <div className="mt-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3 w-full max-w-xl">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder") || "Search by name..."}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="number"
            min="1"
            step="1"
            placeholder={t("minPrice") || "Min"}
            value={minPrice ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") return setMinPrice(null);
              const v = Math.floor(Number(raw));
              setMinPrice(isNaN(v) ? null : Math.max(1, v));
            }}
            className="w-24 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="1"
            step="1"
            placeholder={t("maxPrice") || "Max"}
            value={maxPrice ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") return setMaxPrice(null);
              const v = Math.floor(Number(raw));
              setMaxPrice(isNaN(v) ? null : Math.min(maxAvailable, Math.max(1, v)));
            }}
            className="w-24 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm"
          />
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm">
            <option value={6}>6 / page</option>
            <option value={9}>9 / page</option>
            <option value={12}>12 / page</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <article key={i} className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="relative h-52 bg-slate-100">
                <div className="absolute top-3 left-3 w-12 h-5 rounded-full bg-white/30 animate-pulse" />
                <div className="absolute bottom-3 right-3 w-14 h-5 rounded-full bg-white/20 animate-pulse" />
                <div className="w-full h-full bg-transparent animate-pulse" />
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-3 animate-pulse" />
                <div className="h-3 bg-slate-100 rounded w-full mb-2 animate-pulse" />
                <div className="h-3 bg-slate-100 rounded w-5/6 mb-4 animate-pulse" />
                <div className="mt-auto flex items-center justify-between">
                  <div className="h-6 w-24 bg-slate-200 rounded animate-pulse" />
                  <div className="h-9 w-28 bg-slate-200 rounded-lg animate-pulse" />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginated.map((p) => (
            <article
              key={p.id}
              className="group rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden flex flex-col"
            >
              <div
                className="relative h-52 overflow-hidden bg-slate-50 cursor-pointer"
                onClick={() => onProductClick?.(p)}
                title={t("productDetails")}
              >
                <img
                  src={p.image}
                  alt={p.name[lang]}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {p.popular && (
                  <span className="absolute top-3 left-3 rounded-full bg-[#9B2D8F] px-3 py-1 text-[11px] font-bold text-white shadow">
                    ⭐ {t("popular")}
                  </span>
                )}
                {p.customizable && (
                  <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-[#1CA8DD] shadow">
                    ✏️ {t("custom")}
                  </span>
                )}
                {onProductClick && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full px-3 py-1 text-xs font-semibold text-slate-700 shadow">
                      🔍 {t("productDetails")}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{p.name[lang]}</h3>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
                  {p.description[lang]}
                </p>
                {ratings[p.id] ? (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-amber-400 text-sm">
                      {"★".repeat(Math.round(ratings[p.id].avg))}
                      {"☆".repeat(5 - Math.round(ratings[p.id].avg))}
                    </span>
                    <span className="text-xs text-slate-500">
                      {ratings[p.id].avg} ({ratings[p.id].count})
                    </span>
                  </div>
                ) : null}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xl font-extrabold text-[#9B2D8F]">
                    {formatBRL(p.price)}
                  </span>
                  <button
                    onClick={() => handleAdd(p.id)}
                    className={`rounded-xl px-4 py-2.5 text-sm font-bold transition shadow-md ${justAdded === p.id
                      ? "bg-emerald-500 text-white shadow-emerald-500/25"
                      : "bg-[#9B2D8F] hover:bg-[#7A2270] text-white shadow-purple-500/25"
                      }`}
                  >
                    {justAdded === p.id ? t("added") : `+ ${t("addToCart")}`}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center justify-center gap-3">
        <button
          onClick={() => setPage((s) => Math.max(1, s - 1))}
          disabled={pageIndex <= 1}
          className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40"
        >
          « {t("prev") || "Prev"}
        </button>

        <div className="text-sm text-slate-200">
          {t("page") || "Page"} {pageIndex} / {totalPages}
        </div>

        <button
          onClick={() => setPage((s) => Math.min(totalPages, s + 1))}
          disabled={pageIndex >= totalPages}
          className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40"
        >
          {t("next") || "Next"} »
        </button>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    { icon: "📿", title: t("step1Title"), text: t("step1Text") },
    { icon: "📝", title: t("step2Title"), text: t("step2Text") },
    { icon: "🔐", title: t("step3Title"), text: t("step3Text") },
    { icon: "💳", title: t("step4Title"), text: t("step4Text") },
  ];
  return (
    <section id="how" className="bg-[#FAF3F9] dark:bg-slate-950 py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-bold uppercase tracking-widest text-[#9B2D8F]">
            🤝 {t("navHow")}
          </p>
          <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
            {t("howTitle")}
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400">{t("howSubtitle")}</p>
        </div>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, i) => (
            <div
              key={i}
              className="relative rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-purple-100 dark:border-slate-700"
            >
              <span className="absolute top-4 right-4 text-4xl font-black text-purple-100">
                {i + 1}
              </span>
              <div className="w-12 h-12 rounded-xl bg-[#F3E0F0] flex items-center justify-center text-2xl">
                {s.icon}
              </div>
              <h3 className="mt-4 font-bold text-slate-900 dark:text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-gradient-to-r from-[#9B2D8F] to-[#1CA8DD] p-[2px]">
          <div className="rounded-2xl bg-white dark:bg-slate-900 px-6 py-6 md:px-10 flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <span className="text-4xl">🎁</span>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                {t("groupBannerTitle")}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {t("groupBannerText")}
              </p>
            </div>
            <a
              href="#menu"
              className="rounded-xl bg-[#9B2D8F] hover:bg-[#7A2270] px-6 py-3 font-bold text-white transition shadow-md shadow-purple-500/25 whitespace-nowrap"
            >
              {t("heroCta")} →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function About() {
  const { t } = useI18n();
  return (
    <section id="about" className="mx-auto max-w-6xl px-4 py-16 md:py-20">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div className="relative">
          <div className="absolute -inset-3 rounded-3xl bg-[#F3E0F0] -rotate-2" />
          <img
            src="/necklace.jpg"
            alt="Crafting beaded jewelry"
            loading="lazy"
            className="relative rounded-2xl shadow-xl w-full object-cover aspect-[4/3]"
          />
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-[#9B2D8F]">
            💜 {t("navAbout")}
          </p>
          <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
            {t("aboutTitle")}
          </h2>
          <p className="mt-4 text-slate-500 dark:text-slate-400 leading-relaxed">{t("aboutText")}</p>
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2.5 rounded-xl bg-[#1CA8DD] hover:bg-[#1593C2] px-6 py-3.5 font-bold text-white transition shadow-lg shadow-cyan-500/25"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.026 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
            </svg>
            {t("followFacebook")}
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 ml-3 inline-flex items-center gap-2.5 rounded-xl bg-[#C13584] px-6 py-3.5 font-bold text-white hover:bg-[#a0226f] transition shadow-lg shadow-pink-500/25"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="opacity-90">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.346 3.608 1.32.975.975 1.258 2.242 1.32 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.345 2.633-1.32 3.608-.975.975-2.242 1.258-3.608 1.32-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.345-3.608-1.32-.975-.975-1.258-2.242-1.32-3.608C2.175 15.747 2.163 15.367 2.163 12s.012-3.584.07-4.85c.062-1.366.345-2.633 1.32-3.608C4.528 2.579 5.795 2.296 7.161 2.234 8.427 2.176 8.807 2.163 12 2.163zm0-2.163C8.741 0 8.332.013 7.052.073 5.771.132 4.675.4 3.7 1.376 2.724 2.352 2.456 3.449 2.397 4.73 2.337 6.01 2.324 6.419 2.324 9.678s.013 3.668.073 4.948c.059 1.281.327 2.378 1.303 3.354.976.976 2.073 1.244 3.354 1.303 1.28.06 1.689.073 4.948.073s3.668-.013 4.948-.073c1.281-.059 2.378-.327 3.354-1.303.976-.976 1.244-2.073 1.303-3.354.06-1.28.073-1.689.073-4.948s-.013-3.668-.073-4.948c-.059-1.281-.327-2.378-1.303-3.354C19.378.4 18.281.132 17 .073 15.72.013 15.311 0 12 0z" />
              <path d="M12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998z" />
              <circle cx="18.406" cy="5.594" r="1.44" />
            </svg>
            {t("followInstagram")}
          </a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="bg-[#4A1559] text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 grid sm:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl">
              📿
            </div>
            <div>
              <p className="font-extrabold leading-tight">{t("brand")}</p>
              <p className="text-[11px] text-purple-200">{t("tagline")}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-purple-200 leading-relaxed">{t("footerNote")}</p>
        </div>
        <div className="text-sm">
          <p className="font-bold uppercase tracking-wider text-purple-300 text-xs mb-3">
            {t("navContact")}
          </p>
          <ul className="space-y-2 text-purple-100">
            <li>📍 Brasil</li>
            <li>📱 WhatsApp: (11) 9 5066-1507</li>
            {/* Pix contact removed from footer — Pix is shown only during checkout confirmation */}
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-bold uppercase tracking-wider text-purple-300 text-xs mb-3">
            Social
          </p>
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2.5 font-semibold transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.026 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
            </svg>
            Facebook
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-3 inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2.5 font-semibold transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.346 3.608 1.32.975.975 1.258 2.242 1.32 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.345 2.633-1.32 3.608-.975.975-2.242 1.258-3.608 1.32-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.345-3.608-1.32-.975-.975-1.258-2.242-1.32-3.608C2.175 15.747 2.163 15.367 2.163 12s.012-3.584.07-4.85c.062-1.366.345-2.633 1.32-3.608C4.528 2.579 5.795 2.296 7.161 2.234 8.427 2.176 8.807 2.163 12 2.163zm0-2.163C8.741 0 8.332.013 7.052.073 5.771.132 4.675.4 3.7 1.376 2.724 2.352 2.456 3.449 2.397 4.73 2.337 6.01 2.324 6.419 2.324 9.678s.013 3.668.073 4.948c.059 1.281.327 2.378 1.303 3.354.976.976 2.073 1.244 3.354 1.303 1.28.06 1.689.073 4.948.073s3.668-.013 4.948-.073c1.281-.059 2.378-.327 3.354-1.303.976-.976 1.244-2.073 1.303-3.354.06-1.28.073-1.689.073-4.948s-.013-3.668-.073-4.948c-.059-1.281-.327-2.378-1.303-3.354C19.378.4 18.281.132 17 .073 15.72.013 15.311 0 12 0z" />
              <path d="M12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998z" />
              <circle cx="18.406" cy="5.594" r="1.44" />
            </svg>
            {t("followInstagram")}
          </a>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-purple-300">
        © {new Date().getFullYear()} {t("brand")} — {t("footerRights")}

        <div className="mt-3 flex items-center justify-center gap-3 text-[13px] text-purple-200">
          <span className="inline-flex items-center gap-2 font-semibold">
            Created by <img src="/nheltech-logo.png" alt="NhelTech logo" className="w-5 h-5" /> NhelTech
          </span>

          <a
            href="https://wa.me/5534991545409"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="text-white/90 hover:text-emerald-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M20.52 3.48A11.94 11.94 0 0012 0C5.37 0 .02 5.35.02 12c0 2.11.55 4.17 1.6 6L0 24l6.27-1.61A11.94 11.94 0 0012 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.16-3.48-8.52zM12 21.6c-1.6 0-3.16-.36-4.56-1.04l-.33-.16-3.72.96.98-3.63-.21-.37A9.6 9.6 0 012.4 12 9.6 9.6 0 0112 2.4c5.28 0 9.6 4.32 9.6 9.6S17.28 21.6 12 21.6z" />
              <path d="M17.06 14.14c-.26-.13-1.53-.76-1.77-.85-.24-.09-.41-.13-.58.13-.16.26-.63.85-.77 1.03-.14.18-.28.2-.52.07-.24-.13-1.02-.38-1.94-1.2-.72-.64-1.2-1.44-1.34-1.67-.14-.24-.01-.37.1-.5.09-.09.24-.24.36-.36.12-.12.16-.2.24-.34.08-.14.04-.26-.02-.39-.06-.13-.58-1.39-.8-1.9-.21-.5-.43-.43-.58-.43-.15 0-.32-.01-.49-.01-.17 0-.44.06-.67.31-.24.24-.93.91-.93 2.22 0 1.31.95 2.58 1.08 2.76.12.18 1.86 2.88 4.51 3.93 1.33.52 1.88.56 2.56.47.83-.11 2.53-1.03 2.88-2.03.35-1-.35-1.2-.61-1.33z" fill="#fff" />
            </svg>
          </a>

          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="text-white/90 hover:text-blue-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M22 12a10 10 0 10-11.5 9.9v-7H8.9v-2.9h1.6V9.1c0-1.6 1-2.5 2.4-2.5.7 0 1.4.1 1.4.1v1.6h-.8c-.8 0-1 0-1 1v1.4h1.8l-.3 2.9h-1.5v7A10 10 0 0022 12z" />
            </svg>
          </a>

          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-white/90 hover:text-pink-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm5 6.2A4.8 4.8 0 1016.8 13 4.8 4.8 0 0012 8.2zm6.5-.9a1.2 1.2 0 11-1.2-1.2 1.2 1.2 0 011.2 1.2zM12 15.6A3.6 3.6 0 1115.6 12 3.6 3.6 0 0112 15.6z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
