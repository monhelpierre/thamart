import { useState } from "react";
import { useI18n } from "../i18n";
import { PRODUCTS, FACEBOOK_URL, INSTAGRAM_URL, formatBRL } from "../data/products";

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
          <div className="absolute -bottom-4 -left-4 rounded-2xl bg-white shadow-xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">💠</span>
            <div>
              <p className="text-xs font-bold text-slate-800">Pix</p>
              <p className="text-[10px] text-slate-400">QR Code • Copia e Cola</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Menu / Products ---------------- */
export function Menu({ onAdd }: { onAdd: (id: string) => void }) {
  const { t, lang } = useI18n();
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const handleAdd = (id: string) => {
    onAdd(id);
    setJustAdded(id);
    setTimeout(() => setJustAdded((v) => (v === id ? null : v)), 1200);
  };

  return (
    <section id="menu" className="mx-auto max-w-6xl px-4 py-16 md:py-20">
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-sm font-bold uppercase tracking-widest text-[#9B2D8F]">
          📿 {t("navMenu")}
        </p>
        <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-slate-900">
          {t("menuTitle")}
        </h2>
        <p className="mt-3 text-slate-500">{t("menuSubtitle")}</p>
      </div>

      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {PRODUCTS.map((p) => (
          <article
            key={p.id}
            className="group rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden flex flex-col"
          >
            <div className="relative h-52 overflow-hidden bg-slate-50">
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
            </div>
            <div className="p-5 flex flex-col flex-1">
              <h3 className="font-bold text-lg text-slate-900">{p.name[lang]}</h3>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed flex-1">
                {p.description[lang]}
              </p>
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
    </section>
  );
}

/* ---------------- How it works ---------------- */
export function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    { icon: "📿", title: t("step1Title"), text: t("step1Text") },
    { icon: "📝", title: t("step2Title"), text: t("step2Text") },
    { icon: "🔐", title: t("step3Title"), text: t("step3Text") },
    { icon: "💠", title: t("step4Title"), text: t("step4Text") },
  ];
  return (
    <section id="how" className="bg-[#FAF3F9] py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-bold uppercase tracking-widest text-[#9B2D8F]">
            🤝 {t("navHow")}
          </p>
          <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-slate-900">
            {t("howTitle")}
          </h2>
          <p className="mt-3 text-slate-500">{t("howSubtitle")}</p>
        </div>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, i) => (
            <div
              key={i}
              className="relative rounded-2xl bg-white p-6 shadow-sm border border-purple-100"
            >
              <span className="absolute top-4 right-4 text-4xl font-black text-purple-100">
                {i + 1}
              </span>
              <div className="w-12 h-12 rounded-xl bg-[#F3E0F0] flex items-center justify-center text-2xl">
                {s.icon}
              </div>
              <h3 className="mt-4 font-bold text-slate-900">{s.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-gradient-to-r from-[#9B2D8F] to-[#1CA8DD] p-[2px]">
          <div className="rounded-2xl bg-white px-6 py-6 md:px-10 flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <span className="text-4xl">🎁</span>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-extrabold text-lg text-slate-900">
                {t("groupBannerTitle")}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
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

/* ---------------- About / Facebook ---------------- */
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
          <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-slate-900">
            {t("aboutTitle")}
          </h2>
          <p className="mt-4 text-slate-500 leading-relaxed">{t("aboutText")}</p>
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

/* ---------------- Footer ---------------- */
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
            <li>💠 Pix: pagamentos@thamart.com.br</li>
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
      </div>
    </footer>
  );
}
