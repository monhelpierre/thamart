import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { formatBRL, type Product } from "@/data/products";
import { useSiteConfig } from "@/lib/siteConfig";

/* ---------------- Hero Slideshow ---------------- */
interface Slide {
  id: string;
  type: "image" | "video";
  src: string;
  caption?: string;
  label?: string;
  ctaText?: string;
  ctaLink?: string;
}

function HeroSlideshow() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    fetch("/api/slides")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data) && data.length) setSlides(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length, paused]);

  const slide = slides[current];

  function renderMedia() {
    if (!slide) {
      return (
        <img
          src="/bracelet-flower.jpg"
          alt="ThamArt beaded bracelets"
          className="w-full h-full object-cover"
        />
      );
    }
    if (slide.type === "video") {
      const ytMatch = slide.src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/);
      if (ytMatch) {
        return (
          <iframe
            src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&controls=0`}
            className="w-full h-full"
            allow="autoplay; encrypted-media"
            style={{ border: 0 }}
            title="slide"
          />
        );
      }
      return (
        <video
          src={slide.src}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        />
      );
    }
    return (
      <img
        src={slide.src}
        alt={slide.caption ?? "ThamArt"}
        className="w-full h-full object-cover transition-opacity duration-700"
      />
    );
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0">{renderMedia()}</div>

      {/* Caption overlay */}
      {slide && (slide.caption || slide.label || slide.ctaText) && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-4">
          {slide.label && (
            <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block mb-0.5">
              {slide.label}
            </span>
          )}
          {slide.caption && (
            <p className="text-white font-semibold text-sm leading-snug">{slide.caption}</p>
          )}
          {slide.ctaText && slide.ctaLink && (
            <a
              href={slide.ctaLink}
              className="mt-2 inline-block text-xs text-white bg-[#9B2D8F] hover:bg-[#7A2270] px-3 py-1.5 rounded-full transition font-bold"
            >
              {slide.ctaText}
            </a>
          )}
        </div>
      )}

      {/* Navigation */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((c) => (c - 1 + slides.length) % slides.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 rounded-full text-white flex items-center justify-center text-xl leading-none transition"
          >
            ‹
          </button>
          <button
            onClick={() => setCurrent((c) => (c + 1) % slides.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 rounded-full text-white flex items-center justify-center text-xl leading-none transition"
          >
            ›
          </button>
          <div className="absolute bottom-3 right-4 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all ${
                  i === current
                    ? "w-4 h-1.5 bg-white"
                    : "w-1.5 h-1.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Hero ---------------- */
export function Hero() {
  const { t } = useI18n();
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] via-[var(--primary-dark)] to-[#4A1559]" />
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
              className="rounded-xl bg-[var(--secondary)] px-6 py-3.5 font-bold text-white hover:bg-[var(--secondary-dark)] transition shadow-xl shadow-cyan-900/30"
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
              <div
                key={l}
                className="rounded-xl bg-white/10 backdrop-blur px-3 py-3 text-center"
              >
                <p className="text-xl font-extrabold">{v}</p>
                <p className="text-[11px] text-purple-100 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-3 rounded-3xl bg-white/10 backdrop-blur-sm rotate-2" />
          <div className="relative">
            <HeroSlideshow />
          </div>
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
  selectedCategory?: string | null;
}

export function Menu({
  products,
  onAdd,
  onProductClick,
  isLoading = false,
  selectedCategory = null,
}: MenuProps) {
  const { t, lang } = useI18n();
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [ratings, setRatings] = useState<
    Record<string, { avg: number; count: number }>
  >({});

  useEffect(() => {
    if (!products.length) return;
    Promise.all(
      products.map((p) =>
        fetch(`/api/reviews?productId=${p.id}`)
          .then((r) => r.json())
          .then((reviews) => ({
            id: p.id,
            reviews: Array.isArray(reviews) ? reviews : [],
          }))
          .catch(() => ({ id: p.id, reviews: [] })),
      ),
    ).then((results) => {
      const map: Record<string, { avg: number; count: number }> = {};
      results.forEach(({ id, reviews }) => {
        if (reviews.length > 0) {
          const avg =
            reviews.reduce((s: number, r: any) => s + (r.rating ?? 0), 0) /
            reviews.length;
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
    return Math.max(
      1,
      ...products.map((p) => Math.floor(Number(p.price ?? 0))),
    );
  }, [products]);

  // Track grid column count to load exactly one row at a time
  const colsRef = useRef(2);
  useEffect(() => {
    function updateCols() {
      const w = window.innerWidth;
      if (w >= 1280) colsRef.current = 5;
      else if (w >= 1024) colsRef.current = 4;
      else if (w >= 768) colsRef.current = 3;
      else colsRef.current = 2;
    }
    updateCols();
    window.addEventListener("resize", updateCols);
    return () => window.removeEventListener("resize", updateCols);
  }, []);

  // Infinite scroll
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return 2;
    const w = window.innerWidth;
    if (w >= 1280) return 5;
    if (w >= 1024) return 4;
    if (w >= 768) return 3;
    return 2;
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false); // avoids stale closure in observer
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleAdd = (id: string) => {
    onAdd(id, () => {
      setJustAdded(id);
      setTimeout(() => setJustAdded((v) => (v === id ? null : v)), 1200);
    });
  };

  // Reset when filters/search/products change
  useEffect(() => {
    setVisible(colsRef.current);
    setLoadingMore(false);
    loadingMoreRef.current = false;
  }, [query, minPrice, maxPrice, products, selectedCategory]);

  // Ref callback: (re)attaches the IntersectionObserver whenever the sentinel mounts.
  // Using a callback ref instead of useEffect + useRef so the observer is set up even
  // when the sentinel first renders after the initial load (products arrive async).
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMoreRef.current) {
          loadingMoreRef.current = true;
          setLoadingMore(true);
          setTimeout(() => {
            setVisible((v) => v + colsRef.current);
            setLoadingMore(false);
            loadingMoreRef.current = false;
          }, 600);
        }
      },
      { rootMargin: "200px 0px", threshold: 0 }
    );
    obs.observe(node);
    observerRef.current = obs;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const name = (p.name[lang] ?? Object.values(p.name)[0] ?? "").toLowerCase();
      const price = Math.floor(Number(p.price ?? 0));
      return (
        (q === "" || name.includes(q)) &&
        (minPrice === null || price >= minPrice) &&
        (maxPrice === null || price <= maxPrice) &&
        (selectedCategory === null || p.category === selectedCategory)
      );
    });
  }, [products, query, minPrice, maxPrice, lang, selectedCategory]);

  const visibleProducts = filtered.slice(0, visible);

  return (
    <section id="menu" className="mx-auto max-w-6xl px-4 py-16 md:py-20">
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-sm font-bold uppercase tracking-widest text-[var(--primary)]">
          📿 {t("navMenu")}
        </p>
        <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
          {t("menuTitle")}
        </h2>
        <p className="mt-3 text-slate-500 dark:text-slate-400">{t("menuSubtitle")}</p>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder") || "Buscar por nome..."}
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2D8F]/30"
        />
        <div className="flex gap-2 shrink-0">
          <input
            type="number" min="1" step="1"
            placeholder={t("minPrice") || "Mín R$"}
            value={minPrice ?? ""}
            onChange={(e) => { const v = Math.floor(Number(e.target.value)); setMinPrice(e.target.value === "" ? null : isNaN(v) ? null : Math.max(1, v)); }}
            className="w-full sm:w-28 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="number" min="1" step="1"
            placeholder={t("maxPrice") || "Máx R$"}
            value={maxPrice ?? ""}
            onChange={(e) => { const v = Math.floor(Number(e.target.value)); setMaxPrice(e.target.value === "" ? null : isNaN(v) ? null : Math.min(maxAvailable, Math.max(1, v))); }}
            className="w-full sm:w-28 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <article key={i} className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col animate-pulse">
              <div className="h-40 bg-slate-100 dark:bg-slate-700" />
              <div className="p-3 space-y-2">
                <div className="h-3.5 bg-slate-200 dark:bg-slate-600 rounded w-3/4" />
                <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-full" />
                <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-5/6" />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="h-5 w-16 bg-slate-200 dark:bg-slate-600 rounded" />
                  <div className="h-8 w-20 bg-slate-200 dark:bg-slate-600 rounded-lg" />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {visibleProducts.map((p) => (
              <article
                key={p.id}
                className="group rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden flex flex-col"
              >
                <div
                  className="relative h-40 overflow-hidden bg-slate-50 cursor-pointer"
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
                    <span className="absolute top-2 left-2 rounded-full bg-[var(--primary)] px-2 py-0.5 text-[10px] font-bold text-white shadow">
                      ⭐ {t("popular")}
                    </span>
                  )}
                  {p.customizable && (
                    <span className="absolute bottom-2 right-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-[var(--secondary)] shadow">
                      ✏️ {t("custom")}
                    </span>
                  )}
                  {onProductClick && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full px-2 py-1 text-[10px] font-semibold text-slate-700 shadow">
                        🔍 {t("productDetails")}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                    {p.name[lang]}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex-1 line-clamp-2">
                    {p.description[lang]}
                  </p>
                  {ratings[p.id] && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <span className="text-amber-400 text-xs">
                        {"★".repeat(Math.round(ratings[p.id].avg))}
                        {"☆".repeat(5 - Math.round(ratings[p.id].avg))}
                      </span>
                      <span className="text-[10px] text-slate-500">({ratings[p.id].count})</span>
                    </div>
                  )}
                  <div className="mt-2.5 flex items-center justify-between gap-1.5">
                    <span className="text-base font-extrabold text-[var(--primary)] shrink-0">
                      {formatBRL(p.price)}
                    </span>
                    <button
                      onClick={() => handleAdd(p.id)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition shadow-sm shrink-0 ${
                        justAdded === p.id
                          ? "bg-emerald-500 text-white"
                          : "bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white"
                      }`}
                    >
                      {justAdded === p.id ? "✓" : `+ ${t("addToCart")}`}
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {/* Skeleton cards shown inside the grid while loading more */}
            {loadingMore && Array.from({ length: Math.min(colsRef.current, Math.max(0, filtered.length - visible)) }).map((_, i) => (
              <article key={`skel-${i}`} className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col animate-pulse">
                <div className="h-40 bg-slate-100 dark:bg-slate-700" />
                <div className="p-3 space-y-2">
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-600 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-full" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-5/6" />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="h-5 w-16 bg-slate-200 dark:bg-slate-600 rounded" />
                    <div className="h-8 w-20 bg-slate-200 dark:bg-slate-600 rounded-lg" />
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* key={visible} forces a fresh DOM node + fresh observer after each load
              so the observer fires again even if the sentinel is still in view */}
          {visible < filtered.length && !loadingMore && (
            <div key={visible} ref={sentinelRef} className="h-px" aria-hidden />
          )}

          {filtered.length === 0 && !isLoading && (
            <div className="mt-12 text-center text-slate-400">
              <p className="text-3xl mb-2">🔍</p>
              <p>Nenhum produto encontrado</p>
            </div>
          )}
        </>
      )}
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
          <p className="text-sm font-bold uppercase tracking-widest text-[var(--primary)]">
            🤝 {t("navHow")}
          </p>
          <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
            {t("howTitle")}
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400">
            {t("howSubtitle")}
          </p>
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
              <h3 className="mt-4 font-bold text-slate-900 dark:text-white">
                {s.title}
              </h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {s.text}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] p-[2px]">
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
              className="rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-dark)] px-6 py-3 font-bold text-white transition shadow-md shadow-purple-500/25 whitespace-nowrap"
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
  const cfg = useSiteConfig();
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
          <p className="text-sm font-bold uppercase tracking-widest text-[var(--primary)]">
            💜 {t("navAbout")}
          </p>
          <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
            {t("aboutTitle")}
          </h2>
          <p className="mt-4 text-slate-500 dark:text-slate-400 leading-relaxed">
            {t("aboutText")}
          </p>
          <a
            href={cfg.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2.5 rounded-xl bg-[var(--secondary)] hover:bg-[var(--secondary-dark)] px-6 py-3.5 font-bold text-white transition shadow-lg shadow-cyan-500/25"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.026 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
            </svg>
            {t("followFacebook")}
          </a>
          <a
            href={cfg.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 ml-3 inline-flex items-center gap-2.5 rounded-xl bg-[#C13584] px-6 py-3.5 font-bold text-white hover:bg-[#a0226f] transition shadow-lg shadow-pink-500/25"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="opacity-90"
            >
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

const CATEGORY_LABELS: Record<string, string> = {
  pulseira: "📿 Pulseiras",
  colar: "✨ Colares",
  brincos: "💎 Brincos",
  tornozeleira: "🌊 Tornozeleiras",
};

export function CategoryBar({
  products,
  selected,
  onSelect,
}: {
  products: Product[];
  selected: string | null;
  onSelect: (cat: string | null) => void;
}) {
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    products.forEach((p) => {
      if (p.category && !seen.has(p.category)) {
        seen.add(p.category);
        out.push(p.category);
      }
    });
    return out;
  }, [products]);

  if (categories.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => onSelect(null)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              selected === null
                ? "bg-[var(--primary)] text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            🛍️ Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelect(selected === cat ? null : cat)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                selected === cat
                  ? "bg-[var(--primary)] text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Footer() {
  const { t } = useI18n();
  const cfg = useSiteConfig();
  return (
    <footer className="bg-[#4A1559] text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 grid sm:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl overflow-hidden">
              {cfg.faviconUrl ? (
                <img
                  src={cfg.faviconUrl}
                  alt={cfg.brandName}
                  className="w-full h-full object-cover"
                />
              ) : (
                "📿"
              )}
            </div>
            <div>
              <p className="font-extrabold leading-tight">
                {cfg.brandName || t("brand")}
              </p>
              <p className="text-[11px] text-purple-200">
                {cfg.tagline || t("tagline")}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-purple-200 leading-relaxed">
            {t("footerNote")}
          </p>
        </div>
        <div className="text-sm">
          <p className="font-bold uppercase tracking-wider text-purple-300 text-xs mb-3">
            {t("navContact")}
          </p>
          <ul className="space-y-2 text-purple-100">
            <li>📍 Brasil</li>
            {cfg.whatsappDisplay && <li>📱 WhatsApp: {cfg.whatsappDisplay}</li>}
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-bold uppercase tracking-wider text-purple-300 text-xs mb-3">
            Social
          </p>
          <a
            href={cfg.facebookUrl}
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
            href={cfg.instagramUrl}
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
        © {new Date().getFullYear()} {cfg.brandName || t("brand")} — {t("footerRights")}
        {cfg.creatorName && (
          <div className="mt-3 flex items-center justify-center gap-3 text-[13px] text-purple-200">
            <span className="inline-flex items-center gap-2 font-semibold">
              Created by{" "}
              {cfg.creatorLogoUrl && (
                <img src={cfg.creatorLogoUrl} alt={`${cfg.creatorName} logo`} className="w-5 h-5 rounded object-cover" />
              )}
              {cfg.creatorName}
            </span>
            {cfg.creatorWhatsapp && (
              <a href={`https://wa.me/${cfg.creatorWhatsapp}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="text-white/80 hover:text-emerald-400 transition">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M20.52 3.48A11.94 11.94 0 0012 0C5.37 0 .02 5.35.02 12c0 2.11.55 4.17 1.6 6L0 24l6.27-1.61A11.94 11.94 0 0012 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.16-3.48-8.52zM12 21.6c-1.6 0-3.16-.36-4.56-1.04l-.33-.16-3.72.96.98-3.63-.21-.37A9.6 9.6 0 012.4 12 9.6 9.6 0 0112 2.4c5.28 0 9.6 4.32 9.6 9.6S17.28 21.6 12 21.6z" />
                  <path d="M17.06 14.14c-.26-.13-1.53-.76-1.77-.85-.24-.09-.41-.13-.58.13-.16.26-.63.85-.77 1.03-.14.18-.28.2-.52.07-.24-.13-1.02-.38-1.94-1.2-.72-.64-1.2-1.44-1.34-1.67-.14-.24-.01-.37.1-.5.09-.09.24-.24.36-.36.12-.12.16-.2.24-.34.08-.14.04-.26-.02-.39-.06-.13-.58-1.39-.8-1.9-.21-.5-.43-.43-.58-.43-.15 0-.32-.01-.49-.01-.17 0-.44.06-.67.31-.24.24-.93.91-.93 2.22 0 1.31.95 2.58 1.08 2.76.12.18 1.86 2.88 4.51 3.93 1.33.52 1.88.56 2.56.47.83-.11 2.53-1.03 2.88-2.03.35-1-.35-1.2-.61-1.33z" fill="#fff" />
                </svg>
              </a>
            )}
            {cfg.creatorFacebook && (
              <a href={cfg.creatorFacebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-white/80 hover:text-blue-400 transition">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M22 12a10 10 0 10-11.5 9.9v-7H8.9v-2.9h1.6V9.1c0-1.6 1-2.5 2.4-2.5.7 0 1.4.1 1.4.1v1.6h-.8c-.8 0-1 0-1 1v1.4h1.8l-.3 2.9h-1.5v7A10 10 0 0022 12z" />
                </svg>
              </a>
            )}
            {cfg.creatorInstagram && (
              <a href={cfg.creatorInstagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-white/80 hover:text-pink-400 transition">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm5 6.2A4.8 4.8 0 1016.8 13 4.8 4.8 0 0012 8.2zm6.5-.9a1.2 1.2 0 11-1.2-1.2 1.2 1.2 0 011.2 1.2zM12 15.6A3.6 3.6 0 1115.6 12 3.6 3.6 0 0112 15.6z" />
                </svg>
              </a>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}
