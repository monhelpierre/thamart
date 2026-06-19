"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db, getAuthToken } from "@/lib/firebase";
import { formatBRL } from "@/data/products";
import { DEFAULT_CONFIG, type SiteConfig } from "@/lib/siteConfig";
import ChatModal from "@/components/ChatModal";

type Tab =
  | "orders"
  | "users"
  | "products"
  | "categories"
  | "analytics"
  | "carts"
  | "email"
  | "slides"
  | "config";

type OrderStatus =
  | "pending_payment"
  | "paid"
  | "in_production"
  | "shipped"
  | "delivered";

interface Order {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  items: {
    productId: string;
    name: { pt: string };
    qty: number;
    price: number;
  }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  paymentId?: string;
  trackingCode?: string;
  address?: {
    cep: string;
    street: string;
    number: string;
    city: string;
    state: string;
  };
  createdAt: string;
}

interface UserRow {
  uid: string;
  email: string;
  name: string;
  blocked: boolean;
  createdAt: string;
}

interface Product {
  id: string;
  name: { pt: string; fr: string; en: string };
  description: { pt: string; fr: string; en: string };
  price: number;
  image: string;
  category?: string;
  popular?: boolean;
  customizable?: boolean;
}

interface CartItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  subtotal: number;
}

interface CartRow {
  uid: string;
  userName: string;
  userEmail: string;
  items: CartItem[];
  itemCount: number;
  totalValue: number;
  updatedAt: string;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Aguardando",
  paid: "Confirmado",
  in_production: "Em produção",
  shipped: "Enviado",
  delivered: "Entregue",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  in_production: "bg-blue-100 text-blue-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-purple-100 text-purple-700",
};

const PAGE_SIZE = 10;

function PaginationBar({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => onChange(1)}
        disabled={page === 1}
        className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-500 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
      >
        «
      </button>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
      >
        ← Anterior
      </button>
      <span className="text-xs text-slate-500 dark:text-slate-400 px-1">
        Página {page} de {total}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === total}
        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
      >
        Próxima →
      </button>
      <button
        onClick={() => onChange(total)}
        disabled={page === total}
        className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-500 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
      >
        »
      </button>
    </div>
  );
}

const EMPTY_PRODUCT: Omit<Product, "id"> = {
  name: { pt: "", fr: "", en: "" },
  description: { pt: "", fr: "", en: "" },
  price: 0,
  image: "",
  category: "",
  popular: false,
  customizable: false,
};

const KNOWN_CATEGORIES = [
  { value: "pulseira", label: "📿 Pulseiras" },
  { value: "colar", label: "✨ Colares" },
  { value: "brincos", label: "💎 Brincos" },
  { value: "tornozeleira", label: "🌊 Tornozeleiras" },
];

// ── Markdown ↔ HTML converters for the legal content editor ──

function mdInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let buf: string[] = [];
  const flush = () => {
    const t = buf.join(" ").trim();
    if (t) out.push(`<p>${mdInline(t)}</p>`);
    buf = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      flush();
      out.push(`<h2>${mdInline(line.slice(3))}</h2>`);
    } else if (line === "") {
      flush();
    } else {
      buf.push(line);
    }
  }
  flush();
  return out.join("\n");
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h2>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<em>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<p>([\s\S]*?)<\/p>/gi, "\n$1\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ── Slides Tab ── */
interface Slide {
  id: string;
  type: "image" | "video";
  src: string;
  caption: string;
  label: string;
  ctaText: string;
  ctaLink: string;
  order: number;
  ytBranding?: boolean;
  purpose?: "product" | "ads";
  duration?: number;
}

const DEFAULT_CATEGORIES = [
  { slug: "pulseira", label: "Pulseiras", emoji: "📿" },
  { slug: "colar", label: "Colares", emoji: "✨" },
  { slug: "brincos", label: "Brincos", emoji: "💎" },
  { slug: "tornozeleira", label: "Tornozeleiras", emoji: "🌊" },
];

const DEFAULT_SLIDES: Omit<Slide, "id">[] = [
  {
    type: "image",
    src: "/bracelet-flower.jpg",
    label: "ThamArt",
    caption: "Joias feitas à mão com amor 💜",
    ctaText: "Ver coleção",
    ctaLink: "#menu",
    order: 0,
  },
  {
    type: "video",
    src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    label: "Exemplo YouTube — Substituir",
    caption: "Adicione seu vídeo de produtos aqui",
    ctaText: "Ver mais",
    ctaLink: "#menu",
    order: 1,
  },
  {
    type: "video",
    src: "https://www.youtube.com/watch?v=9bZkp7q19f0",
    label: "Exemplo YouTube 2 — Substituir",
    caption: "Vídeos de unboxing, processo ou depoimentos",
    ctaText: "Comprar agora",
    ctaLink: "#menu",
    order: 2,
  },
];

interface CategoryDef {
  id: string;
  slug: string;
  label: string;
  emoji: string;
  order: number;
}

const EMPTY_CAT = { slug: "", label: "", emoji: "", order: 0 };

function CategoriesTab({ idToken }: { idToken: string | null }) {
  const [cats, setCats] = useState<CategoryDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_CAT);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const authFetch = (url: string, opts: RequestInit = {}) =>
    fetch(url, { ...opts, headers: { ...(opts.headers as Record<string,string> ?? {}), Authorization: `Bearer ${idToken}` } });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/categories");
    if (res.ok) setCats(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function seedDefaults() {
    setSaving(true);
    for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
      await authFetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...DEFAULT_CATEGORIES[i], order: i }),
      });
    }
    await load();
    setSaving(false);
  }

  async function save() {
    if (!form.slug.trim() || !form.label.trim()) return;
    setSaving(true);
    if (editId) {
      await authFetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, ...form }),
      });
    } else {
      await authFetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, order: form.order || cats.length }),
      });
    }
    setForm(EMPTY_CAT);
    setEditId(null);
    await load();
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Excluir categoria?")) return;
    await authFetch(`/api/admin/categories?id=${id}`, { method: "DELETE" });
    setCats((c) => c.filter((x) => x.id !== id));
  }

  function startEdit(cat: CategoryDef) {
    setEditId(cat.id);
    setForm({ slug: cat.slug, label: cat.label, emoji: cat.emoji, order: cat.order });
  }

  const inputCls = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2D8F]/30";

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
          🏷️ Categorias ({cats.length})
        </h2>
        <div className="flex gap-2">
          {cats.length === 0 && !loading && (
            <button
              onClick={seedDefaults}
              disabled={saving}
              className="text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-300 transition disabled:opacity-50"
            >
              {saving ? "..." : "⚡ Seed padrão"}
            </button>
          )}
          <button onClick={load} className="text-sm text-[#9B2D8F] hover:underline">
            {loading ? "Carregando..." : "↺ Atualizar"}
          </button>
        </div>
      </div>

      {/* Category list */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {cats.length === 0 && !loading && (
          <div className="text-center py-10 text-slate-400">
            Nenhuma categoria ainda — clique em ⚡ Seed padrão ou adicione abaixo
          </div>
        )}
        {cats.map((cat, i) => (
          <div
            key={cat.id}
            className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-slate-100 dark:border-slate-800" : ""}`}
          >
            <span className="text-xl w-7 text-center">{cat.emoji || "🏷️"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{cat.label}</p>
              <p className="text-xs text-slate-400 font-mono">{cat.slug} · ordem {cat.order}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => startEdit(cat)}
                className="text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 dark:text-slate-300 transition"
              >
                ✏️
              </button>
              <button
                onClick={() => remove(cat.id)}
                className="text-xs bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg px-2.5 py-1.5 font-semibold text-red-500 transition"
              >
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
        <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">
          {editId ? "✏️ Editar categoria" : "+ Nova categoria"}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Emoji</label>
            <input
              type="text"
              maxLength={4}
              value={form.emoji}
              onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
              placeholder="📿"
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Nome exibido *</label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Pulseiras"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Ordem</label>
            <input
              type="number"
              min={0}
              value={form.order}
              onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Slug (identificador) *</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
            placeholder="pulseira"
            className={inputCls}
          />
          <p className="text-[10px] text-slate-400 mt-1">
            O slug deve coincidir com o campo "Categoria" nos produtos (ex: <span className="font-mono">pulseira</span>)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving || !form.slug.trim() || !form.label.trim()}
            className="flex-1 bg-[var(--primary)] text-white font-bold py-2.5 rounded-xl hover:bg-[var(--primary-dark)] transition disabled:opacity-50 text-sm"
          >
            {saving ? "Salvando..." : editId ? "Salvar alterações" : "Criar categoria"}
          </button>
          {editId && (
            <button
              onClick={() => { setEditId(null); setForm(EMPTY_CAT); }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const EMPTY_SLIDE_FORM = { type: "image" as "image" | "video", src: "", caption: "", label: "", ctaText: "", ctaLink: "", order: 0, ytBranding: false, purpose: "product" as "product" | "ads", duration: 20 as "" | number };

function SlidesTab({ idToken }: { idToken: string | null }) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_SLIDE_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/slides", { headers: { Authorization: `Bearer ${idToken}` } });
    if (res.ok) setSlides(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(s: Slide) {
    setEditingId(s.id);
    setForm({ type: s.type, src: s.src, caption: s.caption, label: s.label, ctaText: s.ctaText, ctaLink: s.ctaLink, order: s.order, ytBranding: s.ytBranding ?? false, purpose: s.purpose ?? "product", duration: s.duration ?? "" });
    document.getElementById("slide-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ ...EMPTY_SLIDE_FORM, order: slides.length });
  }

  async function saveSlide() {
    if (!form.src.trim()) return;
    setSaving(true);
    if (editingId) {
      await fetch("/api/slides", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ id: editingId, ...form }),
      });
      setEditingId(null);
    } else {
      await fetch("/api/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(form),
      });
    }
    setForm({ ...EMPTY_SLIDE_FORM, order: slides.length + 1 });
    await load();
    setSaving(false);
  }

  async function deleteSlide(id: string) {
    if (!confirm("Remover este slide?")) return;
    if (editingId === id) cancelEdit();
    await fetch(`/api/slides?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${idToken}` } });
    setSlides((s) => s.filter((x) => x.id !== id));
  }

  async function seedSlides() {
    setSaving(true);
    for (const s of DEFAULT_SLIDES) {
      await fetch("/api/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(s),
      });
    }
    await load();
    setSaving(false);
  }

  async function uploadMedia(file: File) {
    const isVideo = file.type.startsWith("video/");
    const endpoint = `/api/admin/upload${isVideo ? "?resource=video" : ""}`;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Falha no upload: ${err.error ?? "erro desconhecido"}`);
        return;
      }
      const { url } = await res.json();
      setForm((f) => ({
        ...f,
        src: url,
        type: isVideo ? "video" : "image",
      }));
    } catch {
      alert("Erro ao enviar arquivo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const inputCls = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2D8F]/30";
  const isYoutube = /youtube\.com|youtu\.be/i.test(form.src);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Slides do Hero ({slides.length})</h2>
        <div className="flex items-center gap-3">
          {slides.length === 0 && !loading && (
            <button
              onClick={seedSlides}
              disabled={saving}
              className="text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-300 transition disabled:opacity-50"
            >
              {saving ? "..." : "⚡ Seed padrão"}
            </button>
          )}
          <button onClick={load} className="text-sm text-[#9B2D8F] hover:underline">{loading ? "Carregando..." : "↺ Atualizar"}</button>
        </div>
      </div>

      {/* Existing slides */}
      <div className="space-y-3">
        {slides.map((s, i) => (
          <div key={s.id} className={`flex items-center gap-3 bg-white dark:bg-slate-900 rounded-2xl border p-3 shadow-sm transition ${editingId === s.id ? "border-[#9B2D8F] ring-2 ring-[#9B2D8F]/20" : "border-slate-200 dark:border-slate-700"}`}>
            <span className="text-2xl shrink-0">{s.type === "video" || /youtube\.com|youtu\.be|vimeo\.com|\.(mp4|webm|ogg|mov)/i.test(s.src) ? "🎬" : "🖼️"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{s.label || `Slide ${i + 1}`}</p>
              <p className="text-xs text-slate-400 truncate">{s.src}</p>
              {s.caption && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{s.caption}</p>}
              <div className="flex flex-wrap gap-1 mt-1">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${s.purpose === "ads" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                  {s.purpose === "ads" ? "📢 Ads" : "📦 Produto"}
                </span>
                {s.type === "video" && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                    ⏱ {s.duration ?? 20}s
                  </span>
                )}
                {/youtube\.com|youtu\.be/i.test(s.src) && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${s.ytBranding ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                    {s.ytBranding ? "YT branding ativo" : "sem branding YT"}
                  </span>
                )}
              </div>
            </div>
            {(() => {
              const cls = "w-16 h-12 object-cover rounded-lg border border-slate-100 dark:border-slate-700 shrink-0";
              const ytMatch = s.src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/\s]+)/);
              if (ytMatch) return <img src={`https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`} alt="" className={cls} />;
              if (s.type === "video" && s.src.startsWith("http")) return <video src={s.src} className={cls} muted preload="metadata" />;
              if (s.src.startsWith("http") || s.src.startsWith("/")) return <img src={s.src} alt="" className={cls} />;
              return null;
            })()}
            <button onClick={() => startEdit(s)} className="text-slate-400 hover:text-[#9B2D8F] text-lg shrink-0" title="Editar">✏️</button>
            <button onClick={() => deleteSlide(s.id)} className="text-red-400 hover:text-red-600 text-lg shrink-0" title="Remover">🗑</button>
          </div>
        ))}
        {slides.length === 0 && !loading && (
          <div className="text-center py-10 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
            Nenhum slide ainda — clique em ⚡ Seed padrão ou adicione abaixo
          </div>
        )}
      </div>

      {/* Add / Edit form */}
      <div id="slide-form" className={`rounded-2xl border shadow-sm p-5 space-y-4 transition ${editingId ? "bg-purple-50 dark:bg-slate-800/60 border-[#9B2D8F]/40" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">
            {editingId ? "✏️ Editar slide" : "+ Novo slide"}
          </h3>
          {editingId && (
            <button onClick={cancelEdit} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline">
              Cancelar
            </button>
          )}
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Tipo de mídia</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "image" | "video" }))} className={inputCls}>
              <option value="image">🖼️ Imagem</option>
              <option value="video">🎬 Vídeo (YouTube, Vimeo ou MP4)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Propósito</label>
            <select value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value as "product" | "ads" }))} className={inputCls}>
              <option value="product">📦 Produto</option>
              <option value="ads">📢 Publicidade / Ads</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Ordem</label>
            <input type="number" min={0} value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))} className={inputCls} />
          </div>
        </div>
        {form.type === "video" && (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Duração no slide (segundos)</label>
              <input
                type="number"
                min={10}
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value === "" ? "" : Number(e.target.value) }))}
                placeholder="20"
                className={inputCls}
              />
            </div>
            {form.purpose === "ads" && (
              <div className="flex items-center gap-2 flex-1 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 px-3 py-2.5 self-end mb-0.5">
                <span className="text-base">🔊</span>
                <p className="text-xs text-amber-700 dark:text-amber-400">Publicidade reproduz <strong>com som</strong>.</p>
              </div>
            )}
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            {form.type === "video" ? "URL ou arquivo de vídeo *" : "URL ou arquivo de imagem *"}
          </label>
          <div className="flex gap-2 items-stretch">
            <input
              type="text"
              value={form.src}
              onChange={(e) => setForm((f) => ({ ...f, src: e.target.value }))}
              placeholder={form.type === "video" ? "https://youtube.com/watch?v=... ou cole URL do Cloudinary" : "https://res.cloudinary.com/..."}
              className={`${inputCls} flex-1`}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMedia(f); }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold transition disabled:opacity-50 whitespace-nowrap"
            >
              {uploading ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                  Enviando…
                </>
              ) : (
                <>{form.type === "video" ? "📹" : "🖼️"} Upload</>
              )}
            </button>
          </div>
          {form.type === "video" && (
            <p className="text-[10px] text-slate-400 mt-1">Vídeos grandes (&gt;50 MB) podem falhar — prefira YouTube ou Vimeo para arquivos pesados.</p>
          )}
        </div>
        {form.type === "video" && (
          <label className={`flex items-center gap-2 cursor-pointer select-none rounded-xl px-3 py-2.5 border transition ${isYoutube ? "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" : "border-slate-100 dark:border-slate-800 opacity-40 pointer-events-none"}`}>
            <input
              type="checkbox"
              checked={form.ytBranding}
              disabled={!isYoutube}
              onChange={(e) => setForm((f) => ({ ...f, ytBranding: e.target.checked }))}
              className="w-4 h-4 accent-[#9B2D8F]"
            />
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Mostrar marca YouTube</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{isYoutube ? "Exibe título, ícone YT e permite clicar para abrir o YouTube" : "Apenas para URLs do YouTube"}</p>
            </div>
          </label>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Rótulo (ex: Produto da semana)</label>
            <input type="text" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Legenda</label>
            <input type="text" value={form.caption} onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Texto do botão CTA</label>
            <input type="text" value={form.ctaText} onChange={(e) => setForm((f) => ({ ...f, ctaText: e.target.value }))} placeholder="Ver produto" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Link do CTA</label>
            <input type="text" value={form.ctaLink} onChange={(e) => setForm((f) => ({ ...f, ctaLink: e.target.value }))} placeholder="#menu ou /produto/123" className={inputCls} />
          </div>
        </div>
        <button
          onClick={saveSlide}
          disabled={saving || !form.src.trim()}
          className="w-full rounded-xl bg-[#9B2D8F] hover:bg-[#7A2270] text-white font-bold py-3 transition disabled:opacity-50"
        >
          {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Adicionar slide"}
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [chatBadges, setChatBadges] = useState<Record<string, { unreadAdmin: number; hasUserImage: boolean }>>({});
  const [tab, setTab] = useState<Tab>("orders");
  const [idToken, setIdToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<{ uid: string; displayName: string; email: string; photoURL: string | null } | null>(null);

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [editingOrder, setEditingOrder] = useState<{
    id: string;
    status: OrderStatus;
    trackingCode: string;
  } | null>(null);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);

  // Users
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Email
  const [emailSelected, setEmailSelected] = useState<Set<string>>(new Set());
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{
    sent: number;
    failed: number;
  } | null>(null);

  // Carts
  const [carts, setCarts] = useState<CartRow[]>([]);
  const [cartsLoading, setCartsLoading] = useState(false);
  const [expandedCart, setExpandedCart] = useState<string | null>(null);

  // Live categories (used in product form dropdown)
  const [liveCats, setLiveCats] = useState<CategoryDef[]>([]);
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d) && d.length) setLiveCats(d); })
      .catch(() => {});
  }, []);

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productForm, setProductForm] = useState<
    Omit<Product, "id"> & { id?: string }
  >(EMPTY_PRODUCT);
  const [productModal, setProductModal] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [productSortField, setProductSortField] = useState<"name" | "price">(
    "name",
  );
  const [productSortDir, setProductSortDir] = useState<"asc" | "desc">("asc");
  const [productBadgeFilter, setProductBadgeFilter] = useState<
    "all" | "popular" | "customizable"
  >("all");

  // Orders filter/sort/pagination
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | "">(
    "",
  );
  const [orderSortField, setOrderSortField] = useState<
    "createdAt" | "userEmail" | "userName" | "total"
  >("createdAt");
  const [orderSortDir, setOrderSortDir] = useState<"asc" | "desc">("desc");
  const [orderPage, setOrderPage] = useState(1);

  // Users filter/sort/pagination
  const [userSearch, setUserSearch] = useState("");
  const [userSortField, setUserSortField] = useState<
    "name" | "email" | "createdAt"
  >("createdAt");
  const [userSortDir, setUserSortDir] = useState<"asc" | "desc">("desc");
  const [userPage, setUserPage] = useState(1);

  // Carts filter/sort
  const [cartSearch, setCartSearch] = useState("");
  const [cartSortField, setCartSortField] = useState<
    "totalValue" | "itemCount" | "updatedAt"
  >("updatedAt");
  const [cartSortDir, setCartSortDir] = useState<"asc" | "desc">("desc");

  // Site config
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const faviconRef = useRef<HTMLInputElement>(null);
  const [creatorLogoUploading, setCreatorLogoUploading] = useState(false);
  const creatorLogoRef = useRef<HTMLInputElement>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [legalTab, setLegalTab] = useState<"terms" | "privacy">("terms");
  const [termsMarkdown, setTermsMarkdown] = useState(() =>
    htmlToMarkdown(DEFAULT_CONFIG.termsContent),
  );
  const [privacyMarkdown, setPrivacyMarkdown] = useState(() =>
    htmlToMarkdown(DEFAULT_CONFIG.privacyContent),
  );
  const legalTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setReady(true);
        return;
      }
      const token = await u.getIdToken();
      setIdToken(token);
      setAdminUser({ uid: u.uid, displayName: u.displayName ?? "Admin", email: u.email ?? "", photoURL: u.photoURL });
      // verify admin via a quick probe
      const res = await fetch("/api/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setIsAdmin(true);
        const data = await res.json();
        setOrders(data);
      }
      setReady(true);
      // Load site config immediately so brand name shows in header without visiting Config tab
      fetch("/api/admin/config", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((cfg) => {
          if (cfg && typeof cfg === "object") {
            setSiteConfig((prev) => ({ ...prev, ...cfg }));
          }
        })
        .catch(() => {});
    });
    return unsub;
  }, []);

  async function authFetch(url: string, opts: RequestInit = {}) {
    return fetch(url, {
      ...opts,
      headers: {
        ...(opts.headers ?? {}),
        Authorization: `Bearer ${idToken}`,
      },
    });
  }

  // Realtime badge listener: orders with unread user messages
  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, "chats"), where("unreadAdmin", ">", 0));
    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, { unreadAdmin: number; hasUserImage: boolean }> = {};
      snap.docs.forEach((doc) => {
        const d = doc.data();
        map[doc.id] = { unreadAdmin: d.unreadAdmin ?? 0, hasUserImage: d.hasUserImage ?? false };
      });
      setChatBadges(map);
    });
    return unsub;
  }, [isAdmin]);

  // ---------- Orders ----------
  async function loadOrders() {
    setOrdersLoading(true);
    const res = await authFetch("/api/admin/orders");
    if (res.ok) setOrders(await res.json());
    setOrdersLoading(false);
  }

  async function saveOrderEdit() {
    if (!editingOrder) return;
    const res = await authFetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: editingOrder.id,
        status: editingOrder.status,
        trackingCode: editingOrder.trackingCode,
      }),
    });
    if (res.ok) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === editingOrder.id
            ? {
                ...o,
                status: editingOrder.status,
                trackingCode: editingOrder.trackingCode,
              }
            : o,
        ),
      );
      setEditingOrder(null);
    }
  }

  // ---------- Users ----------
  async function loadUsers() {
    setUsersLoading(true);
    const res = await authFetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setUsersLoading(false);
  }

  async function toggleBlock(uid: string, blocked: boolean) {
    const res = await authFetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, blocked }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, blocked } : u)),
      );
    }
  }

  // ---------- Email ----------
  async function sendEmails() {
    if (!emailSubject.trim() || !emailBody.trim()) return;
    setEmailSending(true);
    setEmailResult(null);
    const uids = emailSelected.size > 0 ? Array.from(emailSelected) : [];
    const res = await authFetch("/api/admin/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uids, subject: emailSubject, html: emailBody }),
    });
    const data = await res.json();
    if (res.ok) setEmailResult({ sent: data.sent, failed: data.failed });
    else setEmailResult({ sent: 0, failed: -1 });
    setEmailSending(false);
  }

  function toggleEmailUser(uid: string) {
    setEmailSelected((prev) => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  }

  function toggleAllEmailUsers() {
    setEmailSelected((prev) =>
      prev.size === users.length ? new Set() : new Set(users.map((u) => u.uid)),
    );
  }

  // ---------- Carts ----------
  async function loadCarts() {
    setCartsLoading(true);
    const res = await authFetch("/api/admin/carts");
    if (res.ok) setCarts(await res.json());
    setCartsLoading(false);
  }

  // ---------- Products ----------
  async function loadProducts() {
    setProductsLoading(true);
    const res = await authFetch("/api/products");
    if (res.ok) setProducts(await res.json());
    setProductsLoading(false);
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return null;
    setImageUploading(true);
    const fd = new FormData();
    fd.append("file", imageFile);
    const res = await authFetch("/api/admin/upload", {
      method: "POST",
      body: fd,
    });
    setImageUploading(false);
    if (!res.ok) {
      alert("Falha no upload da imagem");
      return null;
    }
    const { url } = await res.json();
    return url;
  }

  async function saveProduct() {
    setProductSaving(true);
    let image = productForm.image;
    if (imageFile) {
      const url = await uploadImage();
      if (!url) {
        setProductSaving(false);
        return;
      }
      image = url;
    }

    const body = { ...productForm, image };
    const isEdit = !!productForm.id;
    const res = await authFetch(`/api/admin/products`, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const saved = await res.json();
      if (isEdit) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productForm.id ? { ...p, ...body, id: p.id } : p,
          ),
        );
      } else {
        setProducts((prev) => [
          ...prev,
          { ...body, id: saved.id, image } as Product,
        ]);
      }
      setProductModal(false);
      setImageFile(null);
    }
    setProductSaving(false);
  }

  async function deleteProduct(id: string) {
    if (!confirm("Excluir produto?")) return;
    const res = await authFetch(`/api/admin/products?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  // ---------- Site config ----------
  async function loadConfig() {
    try {
      const res = await fetch("/api/admin/config");
      const data = await res.json();
      if (data && typeof data === "object" && Object.keys(data).length > 0) {
        const merged = { ...DEFAULT_CONFIG, ...data };
        setSiteConfig(merged);
        setTermsMarkdown(
          htmlToMarkdown(merged.termsContent || DEFAULT_CONFIG.termsContent),
        );
        setPrivacyMarkdown(
          htmlToMarkdown(
            merged.privacyContent || DEFAULT_CONFIG.privacyContent,
          ),
        );
      }
    } catch {}
  }

  async function uploadFavicon(file: File) {
    setFaviconUploading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!uploadRes.ok) throw new Error("upload failed");
      const { url } = await uploadRes.json();
      setSiteConfig((c) => ({ ...c, faviconUrl: url }));
      // Persist only the faviconUrl immediately (endpoint uses merge:true)
      await fetch("/api/admin/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ faviconUrl: url }),
      });
    } catch (e) {
      console.error("favicon upload error", e);
    } finally {
      setFaviconUploading(false);
    }
  }

  async function uploadCreatorLogo(file: File) {
    setCreatorLogoUploading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!uploadRes.ok) throw new Error("upload failed");
      const { url } = await uploadRes.json();
      setSiteConfig((c) => ({ ...c, creatorLogoUrl: url }));
      await fetch("/api/admin/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ creatorLogoUrl: url }),
      });
    } catch (e) {
      console.error("creator logo upload error", e);
    } finally {
      setCreatorLogoUploading(false);
    }
  }

  async function saveConfig() {
    setConfigSaving(true);
    setConfigSaved(false);
    try {
      const idToken = await getAuthToken();
      if (!idToken) return;
      const payload = {
        ...siteConfig,
        termsContent: markdownToHtml(termsMarkdown),
        privacyContent: markdownToHtml(privacyMarkdown),
      };
      await fetch("/api/admin/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });
      setSiteConfig(payload);
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 3000);
    } catch {
    } finally {
      setConfigSaving(false);
    }
  }

  function insertLegalFormat(type: "h2" | "bold" | "italic") {
    const el = legalTextareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = legalTab === "terms" ? termsMarkdown : privacyMarkdown;
    const setter = legalTab === "terms" ? setTermsMarkdown : setPrivacyMarkdown;

    if (type === "h2") {
      const lineStart = current.lastIndexOf("\n", start - 1) + 1;
      const lineEnd = current.indexOf("\n", end);
      const lineContent = current.slice(
        lineStart,
        lineEnd === -1 ? current.length : lineEnd,
      );
      const newLine = lineContent.startsWith("## ")
        ? lineContent.slice(3)
        : `## ${lineContent}`;
      const newText =
        current.slice(0, lineStart) +
        newLine +
        (lineEnd === -1 ? "" : current.slice(lineEnd));
      setter(newText);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(
          lineStart + newLine.length,
          lineStart + newLine.length,
        );
      });
      return;
    }
    const [pre, suf, ph]: [string, string, string] =
      type === "bold" ? ["**", "**", "negrito"] : ["*", "*", "itálico"];
    const selected = current.slice(start, end) || ph;
    const replacement = `${pre}${selected}${suf}`;
    setter(current.slice(0, start) + replacement + current.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(
        start + pre.length,
        start + pre.length + selected.length,
      );
    });
  }

  // Load data when tab changes
  useEffect(() => {
    if (!isAdmin || !idToken) return;
    if (tab === "users" && users.length === 0) loadUsers();
    if (tab === "products" && products.length === 0) loadProducts();
    if (tab === "carts" && carts.length === 0) loadCarts();
    if (tab === "email" && users.length === 0) loadUsers();
    if (tab === "config") {
      loadConfig();
      getAuthToken().then((token) => {
        if (!token) return;
        fetch("/api/admin/is-creator", {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then((d) => setIsCreator(!!d.isCreator))
          .catch(() => {});
      });
    }
  }, [tab, isAdmin, idToken]);

  // ---------- Analytics ----------
  const revenue = orders.reduce((s, o) => s + (o.total ?? 0), 0);
  const platformEarnings = orders
    .filter((o) =>
      ["paid", "in_production", "shipped", "delivered"].includes(o.status),
    )
    .reduce((s, o) => s + ((o as any).platformFee ?? 0), 0);
  const byStatus = Object.fromEntries(
    (
      [
        "pending_payment",
        "paid",
        "in_production",
        "shipped",
        "delivered",
      ] as OrderStatus[]
    ).map((s) => [s, orders.filter((o) => o.status === s).length]),
  ) as Record<OrderStatus, number>;

  // Last 7 days revenue
  const last7: { label: string; revenue: number }[] = Array.from(
    { length: 7 },
    (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      return {
        label: d.toLocaleDateString("pt-BR", {
          weekday: "short",
          day: "numeric",
        }),
        revenue: orders
          .filter((o) => o.createdAt.slice(0, 10) === key)
          .reduce((s, o) => s + (o.total ?? 0), 0),
      };
    },
  );
  const maxRev = Math.max(...last7.map((d) => d.revenue), 1);

  const displayedOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    let list = orders.filter((o) => {
      if (orderStatusFilter && o.status !== orderStatusFilter) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        (o.userEmail ?? "").toLowerCase().includes(q) ||
        (o.userName ?? "").toLowerCase().includes(q)
      );
    });
    list.sort((a, b) => {
      let va: string | number, vb: string | number;
      if (orderSortField === "total") {
        va = a.total;
        vb = b.total;
      } else if (orderSortField === "userEmail") {
        va = (a.userEmail ?? "").toLowerCase();
        vb = (b.userEmail ?? "").toLowerCase();
      } else if (orderSortField === "userName") {
        va = (a.userName ?? "").toLowerCase();
        vb = (b.userName ?? "").toLowerCase();
      } else {
        va = a.createdAt;
        vb = b.createdAt;
      }
      if (va < vb) return orderSortDir === "asc" ? -1 : 1;
      if (va > vb) return orderSortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [orders, orderSearch, orderStatusFilter, orderSortField, orderSortDir]);

  const displayedUsers = useMemo(() => {
    let list = [...users];
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      let va: string, vb: string;
      if (userSortField === "name") {
        va = a.name.toLowerCase();
        vb = b.name.toLowerCase();
      } else if (userSortField === "email") {
        va = a.email.toLowerCase();
        vb = b.email.toLowerCase();
      } else {
        va = a.createdAt;
        vb = b.createdAt;
      }
      if (va < vb) return userSortDir === "asc" ? -1 : 1;
      if (va > vb) return userSortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [users, userSearch, userSortField, userSortDir]);

  const displayedCarts = useMemo(() => {
    let list = [...carts];
    if (cartSearch.trim()) {
      const q = cartSearch.toLowerCase();
      list = list.filter(
        (c) =>
          (c.userName ?? "").toLowerCase().includes(q) ||
          (c.userEmail ?? "").toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      let va: number | string, vb: number | string;
      if (cartSortField === "totalValue") {
        va = a.totalValue;
        vb = b.totalValue;
      } else if (cartSortField === "itemCount") {
        va = a.itemCount;
        vb = b.itemCount;
      } else {
        va = a.updatedAt ?? "";
        vb = b.updatedAt ?? "";
      }
      if (va < vb) return cartSortDir === "asc" ? -1 : 1;
      if (va > vb) return cartSortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [carts, cartSearch, cartSortField, cartSortDir]);

  const totalOrderPages = Math.max(
    1,
    Math.ceil(displayedOrders.length / PAGE_SIZE),
  );
  const pagedOrders = displayedOrders.slice(
    (orderPage - 1) * PAGE_SIZE,
    orderPage * PAGE_SIZE,
  );

  const totalUserPages = Math.max(
    1,
    Math.ceil(displayedUsers.length / PAGE_SIZE),
  );
  const pagedUsers = displayedUsers.slice(
    (userPage - 1) * PAGE_SIZE,
    userPage * PAGE_SIZE,
  );

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.pt.toLowerCase().includes(q) ||
          p.name.en.toLowerCase().includes(q) ||
          p.name.fr.toLowerCase().includes(q),
      );
    }
    if (productBadgeFilter === "popular") list = list.filter((p) => p.popular);
    if (productBadgeFilter === "customizable")
      list = list.filter((p) => p.customizable);
    list.sort((a, b) => {
      const va =
        productSortField === "price" ? a.price : a.name.pt.toLowerCase();
      const vb =
        productSortField === "price" ? b.price : b.name.pt.toLowerCase();
      if (va < vb) return productSortDir === "asc" ? -1 : 1;
      if (va > vb) return productSortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [
    products,
    productSearch,
    productBadgeFilter,
    productSortField,
    productSortDir,
  ]);

  const totalProductPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PAGE_SIZE),
  );
  const pagedProducts = filteredProducts.slice(
    (productPage - 1) * PAGE_SIZE,
    productPage * PAGE_SIZE,
  );

  // Reset pages when filters change
  useEffect(
    () => setOrderPage(1),
    [orderSearch, orderStatusFilter, orderSortField, orderSortDir],
  );
  useEffect(() => setUserPage(1), [userSearch, userSortField, userSortDir]);
  useEffect(
    () => setProductPage(1),
    [productSearch, productBadgeFilter, productSortField, productSortDir],
  );

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <p className="text-2xl font-bold text-slate-700">🔒 Acesso restrito</p>
        <p className="text-slate-500">
          Você não tem permissão para acessar esta área.
        </p>
        <a href="/" className="text-[var(--primary)] underline">
          ← Voltar à loja
        </a>
      </div>
    );
  }

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "orders", label: "Pedidos", icon: "📦" },
    { key: "users", label: "Usuários", icon: "👥" },
    { key: "products", label: "Produtos", icon: "💎" },
    { key: "categories", label: "Categorias", icon: "🏷️" },
    { key: "carts", label: "Carrinhos", icon: "🛒" },
    { key: "email", label: "E-mails", icon: "✉️" },
    { key: "slides", label: "Slides", icon: "🖼️" },
    { key: "analytics", label: "Analytics", icon: "📊" },
    { key: "config", label: "Config", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">
              {siteConfig.brandName}
            </p>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Admin Dashboard
            </h1>
          </div>
          <a href="/" className="text-sm text-[var(--primary)] hover:underline">
            ← Loja
          </a>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-1 pb-0 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
                tab === t.key
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* ── ORDERS ── */}
        {tab === "orders" && (
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mr-auto">
                Pedidos ({displayedOrders.length}
                {orderSearch || orderStatusFilter ? ` / ${orders.length}` : ""})
              </h2>
              <input
                type="text"
                placeholder="Buscar e-mail ou ID..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] placeholder:text-slate-400"
              />
              <select
                value={orderStatusFilter}
                onChange={(e) =>
                  setOrderStatusFilter(e.target.value as OrderStatus | "")
                }
                className="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              >
                <option value="">Todos os status</option>
                {(Object.entries(STATUS_LABELS) as [OrderStatus, string][]).map(
                  ([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ),
                )}
              </select>
              <select
                value={orderSortField}
                onChange={(e) =>
                  setOrderSortField(e.target.value as typeof orderSortField)
                }
                className="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              >
                <option value="createdAt">Data</option>
                <option value="userEmail">E-mail</option>
                <option value="userName">Nome</option>
                <option value="total">Total</option>
              </select>
              <button
                onClick={() =>
                  setOrderSortDir((d) => (d === "asc" ? "desc" : "asc"))
                }
                className="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                {orderSortDir === "asc" ? "↑ Asc" : "↓ Desc"}
              </button>
              <button
                onClick={loadOrders}
                className="text-sm text-[var(--primary)] hover:underline ml-1"
              >
                {ordersLoading ? "Carregando..." : "↺ Atualizar"}
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                    <tr>
                      {(
                        [
                          ["Pedido", "hidden sm:table-cell"],
                          ["Cliente", ""],
                          ["Status", ""],
                          ["Total", ""],
                          ["Data", "hidden md:table-cell"],
                          ["Ações", ""],
                        ] as [string, string][]
                      ).map(([h, cls]) => (
                        <th
                          key={h}
                          className={`px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ${cls}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pagedOrders.map((order) => {
                      const isEditing = editingOrder?.id === order.id;
                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition"
                        >
                          <td className="hidden sm:table-cell px-3 sm:px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                            {order.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-xs max-w-[140px] sm:max-w-[160px]">
                            <p className="truncate text-slate-700 dark:text-slate-200 font-medium">
                              {order.userEmail || order.userName || "—"}
                            </p>
                            {order.userName && order.userEmail && (
                              <p className="truncate text-slate-400 text-[10px]">
                                {order.userName}
                              </p>
                            )}
                          </td>
                          <td className="px-3 sm:px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status]}`}
                            >
                              {STATUS_LABELS[order.status]}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3 font-bold text-[var(--primary)]">
                            {formatBRL(order.total)}
                          </td>
                          <td className="hidden md:table-cell px-3 sm:px-4 py-3 text-xs text-slate-400">
                            {new Date(order.createdAt).toLocaleDateString(
                              "pt-BR",
                            )}
                          </td>
                          <td className="px-3 sm:px-4 py-3">
                            {isEditing ? (
                              <div className="flex flex-col gap-1.5 min-w-[220px]">
                                <select
                                  value={editingOrder.status}
                                  onChange={(e) =>
                                    setEditingOrder((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            status: e.target
                                              .value as OrderStatus,
                                          }
                                        : prev,
                                    )
                                  }
                                  className="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                >
                                  {(
                                    Object.keys(STATUS_LABELS) as OrderStatus[]
                                  ).map((s) => (
                                    <option key={s} value={s}>
                                      {STATUS_LABELS[s]}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  placeholder="Código de rastreio"
                                  value={editingOrder.trackingCode}
                                  onChange={(e) =>
                                    setEditingOrder((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            trackingCode: e.target.value,
                                          }
                                        : prev,
                                    )
                                  }
                                  className="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                />
                                <div className="flex gap-1">
                                  <button
                                    onClick={saveOrderEdit}
                                    className="flex-1 bg-[var(--primary)] text-white text-xs rounded-lg py-1.5 font-semibold hover:bg-[var(--primary-dark)] transition"
                                  >
                                    Salvar
                                  </button>
                                  <button
                                    onClick={() => setEditingOrder(null)}
                                    className="flex-1 bg-slate-100 text-slate-600 text-xs rounded-lg py-1.5 font-semibold hover:bg-slate-200 transition"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    setEditingOrder({
                                      id: order.id,
                                      status: order.status,
                                      trackingCode: order.trackingCode ?? "",
                                    })
                                  }
                                  className="text-xs text-[var(--secondary)] hover:underline"
                                >
                                  ✏️ Editar
                                </button>
                                {order.status !== "pending_payment" && (
                                  <button
                                    onClick={() => setChatOrderId(order.id)}
                                    className="relative text-xs text-[#9B2D8F] hover:underline inline-flex items-center gap-1"
                                  >
                                    💬 Chat
                                    {chatBadges[order.id] && (
                                      <span className="inline-flex items-center gap-0.5 min-w-[18px] h-[16px] rounded-full bg-red-500 text-white text-[8px] font-bold px-1 leading-none">
                                        {chatBadges[order.id].hasUserImage ? "📷" : ""}{chatBadges[order.id].unreadAdmin}
                                      </span>
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {displayedOrders.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    {orderSearch || orderStatusFilter
                      ? "Nenhum pedido encontrado para este filtro"
                      : "Nenhum pedido encontrado"}
                  </div>
                )}
              </div>
            </div>
            <PaginationBar
              page={orderPage}
              total={totalOrderPages}
              onChange={setOrderPage}
            />
          </div>
        )}

        {/* ── USERS ── */}
        {tab === "users" && (
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mr-auto">
                Usuários ({displayedUsers.length}
                {userSearch ? ` / ${users.length}` : ""})
              </h2>
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg px-3 py-1.5 w-52 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] placeholder:text-slate-400"
              />
              <select
                value={userSortField}
                onChange={(e) =>
                  setUserSortField(e.target.value as typeof userSortField)
                }
                className="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              >
                <option value="createdAt">Data</option>
                <option value="name">Nome</option>
                <option value="email">E-mail</option>
              </select>
              <button
                onClick={() =>
                  setUserSortDir((d) => (d === "asc" ? "desc" : "asc"))
                }
                className="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                {userSortDir === "asc" ? "↑ Asc" : "↓ Desc"}
              </button>
              <button
                onClick={loadUsers}
                className="text-sm text-[var(--primary)] hover:underline ml-1"
              >
                {usersLoading ? "Carregando..." : "↺ Atualizar"}
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                    <tr>
                      {(
                        [
                          ["Nome", ""],
                          ["Email", ""],
                          ["UID", "hidden sm:table-cell"],
                          ["Status", ""],
                          ["Ações", ""],
                        ] as [string, string][]
                      ).map(([h, cls]) => (
                        <th
                          key={h}
                          className={`px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ${cls}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pagedUsers.map((u) => (
                      <tr
                        key={u.uid}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition"
                      >
                        <td className="px-3 sm:px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                          {u.name || "—"}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-slate-500 dark:text-slate-400 text-xs max-w-[120px] sm:max-w-none truncate">
                          {u.email}
                        </td>
                        <td className="hidden sm:table-cell px-3 sm:px-4 py-3 font-mono text-xs text-slate-400">
                          {u.uid.slice(0, 12)}…
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.blocked ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                          >
                            {u.blocked ? "Bloqueado" : "Ativo"}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <button
                            onClick={() => toggleBlock(u.uid, !u.blocked)}
                            className={`text-xs px-3 py-1 rounded-lg font-semibold transition ${
                              u.blocked
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                            }`}
                          >
                            {u.blocked ? "Desbloquear" : "Bloquear"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {displayedUsers.length === 0 && !usersLoading && (
                  <div className="text-center py-12 text-slate-400">
                    {userSearch
                      ? "Nenhum usuário encontrado para esta busca"
                      : "Nenhum usuário encontrado"}
                  </div>
                )}
              </div>
            </div>
            <PaginationBar
              page={userPage}
              total={totalUserPages}
              onChange={setUserPage}
            />
          </div>
        )}

        {/* ── PRODUCTS ── */}
        {tab === "products" && (
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mr-auto">
                Produtos ({filteredProducts.length}
                {productSearch || productBadgeFilter !== "all"
                  ? ` / ${products.length}`
                  : ""}
                )
              </h2>
              <input
                type="text"
                placeholder="Buscar produto..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg px-3 py-1.5 w-44 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] placeholder:text-slate-400"
              />
              <select
                value={productBadgeFilter}
                onChange={(e) =>
                  setProductBadgeFilter(
                    e.target.value as typeof productBadgeFilter,
                  )
                }
                className="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              >
                <option value="all">Todos</option>
                <option value="popular">⭐ Mais vendido</option>
                <option value="customizable">✏️ Personalizável</option>
              </select>
              <select
                value={productSortField}
                onChange={(e) =>
                  setProductSortField(e.target.value as typeof productSortField)
                }
                className="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              >
                <option value="name">Nome</option>
                <option value="price">Preço</option>
              </select>
              <button
                onClick={() =>
                  setProductSortDir((d) => (d === "asc" ? "desc" : "asc"))
                }
                className="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                {productSortDir === "asc" ? "↑ Asc" : "↓ Desc"}
              </button>
              <button
                onClick={() => {
                  setProductForm(EMPTY_PRODUCT);
                  setImageFile(null);
                  setProductModal(true);
                }}
                className="bg-[var(--primary)] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[var(--primary-dark)] transition"
              >
                + Novo
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              {pagedProducts.map((p, i) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition ${i > 0 ? "border-t border-slate-100 dark:border-slate-800" : ""}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image}
                    alt={p.name.pt}
                    className="w-10 h-10 rounded-lg object-cover shrink-0 bg-slate-100"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {p.name.pt}
                      </p>
                      {p.popular && (
                        <span className="shrink-0 text-[9px] bg-[#F3E0F0] text-[var(--primary)] px-1.5 py-0.5 rounded-full font-bold">
                          ⭐
                        </span>
                      )}
                      {p.customizable && (
                        <span className="shrink-0 text-[9px] bg-[#EBF8FF] dark:bg-[var(--secondary)]/20 text-[var(--secondary)] px-1.5 py-0.5 rounded-full font-bold">
                          ✏️
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[var(--primary)]">
                        {formatBRL(p.price)}
                      </p>
                      {p.category && (
                        <span className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">
                          {p.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setProductForm({ ...p });
                        setImageFile(null);
                        setProductModal(true);
                      }}
                      className="text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 dark:text-slate-300 transition"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="text-xs bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg px-2.5 py-1.5 font-semibold text-red-500 transition"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 && !productsLoading && (
                <div className="text-center py-12 text-slate-400">
                  {productSearch || productBadgeFilter !== "all"
                    ? "Nenhum produto encontrado para este filtro"
                    : "Nenhum produto encontrado"}
                </div>
              )}
              {productsLoading && (
                <div className="text-center py-12">
                  <div className="inline-block w-6 h-6 rounded-full border-3 border-[var(--primary)] border-t-transparent animate-spin" />
                </div>
              )}
            </div>

            <PaginationBar
              page={productPage}
              total={totalProductPages}
              onChange={setProductPage}
            />
          </div>
        )}

        {/* ── CATEGORIES ── */}
        {tab === "categories" && (
          <CategoriesTab idToken={idToken} />
        )}

        {/* ── CARTS ── */}
        {tab === "carts" && (
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mr-auto">
                Carrinhos ({displayedCarts.length}
                {cartSearch ? ` / ${carts.length}` : ""})
              </h2>
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={cartSearch}
                onChange={(e) => setCartSearch(e.target.value)}
                className="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg px-3 py-1.5 w-52 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] placeholder:text-slate-400"
              />
              <select
                value={cartSortField}
                onChange={(e) =>
                  setCartSortField(e.target.value as typeof cartSortField)
                }
                className="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              >
                <option value="updatedAt">Data</option>
                <option value="totalValue">Valor</option>
                <option value="itemCount">Itens</option>
              </select>
              <button
                onClick={() =>
                  setCartSortDir((d) => (d === "asc" ? "desc" : "asc"))
                }
                className="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                {cartSortDir === "asc" ? "↑ Asc" : "↓ Desc"}
              </button>
              <button
                onClick={loadCarts}
                className="text-sm text-[var(--primary)] hover:underline ml-1"
              >
                {cartsLoading ? "Carregando..." : "↺ Atualizar"}
              </button>
            </div>

            <div className="space-y-3">
              {displayedCarts.map((c) => {
                const isOpen = expandedCart === c.uid;
                return (
                  <div
                    key={c.uid}
                    className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
                  >
                    {/* Row header */}
                    <button
                      className="w-full flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition"
                      onClick={() => setExpandedCart(isOpen ? null : c.uid)}
                    >
                      {/* User info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">
                          {c.userName || "Usuário anônimo"}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {c.userEmail || c.uid.slice(0, 16) + "…"}
                        </p>
                      </div>

                      {/* Item pills */}
                      <div className="hidden md:flex items-center gap-1.5 flex-wrap max-w-xs">
                        {c.items.slice(0, 3).map((item) => (
                          <span
                            key={item.productId}
                            className="px-2 py-0.5 bg-[#F3E0F0] text-[var(--primary)] text-[10px] font-semibold rounded-full whitespace-nowrap"
                          >
                            {item.qty}×{" "}
                            {item.name.length > 18
                              ? item.name.slice(0, 18) + "…"
                              : item.name}
                          </span>
                        ))}
                        {c.items.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-semibold">
                            +{c.items.length - 3}
                          </span>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="text-right shrink-0">
                        <p className="font-extrabold text-[var(--primary)] text-sm">
                          {formatBRL(c.totalValue)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {c.itemCount} {c.itemCount === 1 ? "item" : "itens"}
                        </p>
                      </div>

                      {/* Updated */}
                      <div className="hidden lg:block text-right shrink-0 w-24">
                        <p className="text-[10px] text-slate-400">
                          {c.updatedAt
                            ? new Date(c.updatedAt).toLocaleDateString("pt-BR")
                            : "—"}
                        </p>
                      </div>

                      <span className="text-slate-300 text-lg ml-1">
                        {isOpen ? "▲" : "▼"}
                      </span>
                    </button>

                    {/* Expanded item list */}
                    {isOpen && (
                      <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-3 dark:bg-slate-900/50">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-400 uppercase tracking-wide">
                              <th className="pb-2 text-left font-semibold">
                                Produto
                              </th>
                              <th className="pb-2 text-center font-semibold w-16">
                                Qtd
                              </th>
                              <th className="pb-2 text-right font-semibold w-24">
                                Unitário
                              </th>
                              <th className="pb-2 text-right font-semibold w-24">
                                Subtotal
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {c.items.map((item) => (
                              <tr key={item.productId}>
                                <td className="py-2 text-slate-700 dark:text-slate-300 font-medium">
                                  {item.name}
                                </td>
                                <td className="py-2 text-center text-slate-500 dark:text-slate-400">
                                  {item.qty}
                                </td>
                                <td className="py-2 text-right text-slate-500 dark:text-slate-400">
                                  {formatBRL(item.price)}
                                </td>
                                <td className="py-2 text-right font-bold text-[var(--primary)]">
                                  {formatBRL(item.subtotal)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-slate-200 dark:border-slate-700">
                              <td
                                colSpan={3}
                                className="pt-2 text-right text-slate-500 dark:text-slate-400 font-semibold"
                              >
                                Total
                              </td>
                              <td className="pt-2 text-right font-extrabold text-[var(--primary)]">
                                {formatBRL(c.totalValue)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}

              {displayedCarts.length === 0 && !cartsLoading && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-center py-16 text-slate-400">
                  {cartSearch
                    ? "Nenhum carrinho encontrado para esta busca"
                    : "Nenhum carrinho ativo no momento"}
                </div>
              )}

              {cartsLoading && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-center py-16">
                  <div className="inline-block w-8 h-8 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── EMAIL ── */}
        {tab === "email" && (
          <div className="grid lg:grid-cols-5 gap-6">
            {/* User selector */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Destinatários
                </h3>
                <button
                  onClick={toggleAllEmailUsers}
                  className="text-xs text-[var(--primary)] hover:underline font-semibold"
                >
                  {emailSelected.size === users.length && users.length > 0
                    ? "Desmarcar todos"
                    : "Selecionar todos"}
                </button>
              </div>

              <div className="overflow-y-auto max-h-[420px] divide-y divide-slate-50 dark:divide-slate-800">
                {usersLoading && (
                  <div className="text-center py-8 text-slate-400 text-sm animate-pulse">
                    Carregando usuários...
                  </div>
                )}
                {!usersLoading && users.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    Nenhum usuário
                  </div>
                )}
                {users.map((u) => (
                  <label
                    key={u.uid}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={emailSelected.has(u.uid)}
                      onChange={() => toggleEmailUser(u.uid)}
                      className="accent-[var(--primary)] w-4 h-4 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {u.name || "—"}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {u.email}
                      </p>
                    </div>
                    {u.blocked && (
                      <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-semibold">
                        Bloqueado
                      </span>
                    )}
                  </label>
                ))}
              </div>

              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500">
                {emailSelected.size === 0
                  ? "Nenhum selecionado — enviará para todos"
                  : `${emailSelected.size} selecionado${emailSelected.size > 1 ? "s" : ""}`}
              </div>
            </div>

            {/* Compose */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Compor mensagem
                </h3>
              </div>

              <div className="flex-1 p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Assunto *
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder={`Ex: Novidade na ${siteConfig.brandName} 🎀`}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Corpo (HTML ou texto simples) *
                  </label>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={10}
                    placeholder={`<h2>Olá!</h2>\n<p>Temos uma novidade incrível para você...</p>\n<br>\n<p>Com carinho, {siteConfig.brandName} 📿</p>`}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)] resize-none font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Suporta HTML completo ou texto simples.
                  </p>
                </div>

                {/* Result banner */}
                {emailResult && (
                  <div
                    className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                      emailResult.failed === -1
                        ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800"
                        : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800"
                    }`}
                  >
                    {emailResult.failed === -1
                      ? "Erro ao enviar. Verifique RESEND_API_KEY."
                      : `✅ ${emailResult.sent} enviado${emailResult.sent !== 1 ? "s" : ""}${emailResult.failed > 0 ? ` · ❌ ${emailResult.failed} falha${emailResult.failed !== 1 ? "s" : ""}` : ""}`}
                  </div>
                )}
              </div>

              <div className="px-5 pb-5">
                <button
                  onClick={sendEmails}
                  disabled={
                    emailSending || !emailSubject.trim() || !emailBody.trim()
                  }
                  className="w-full rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-dark)] px-4 py-3 font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {emailSending
                    ? "Enviando..."
                    : `✉️ Enviar${emailSelected.size > 0 ? ` para ${emailSelected.size} usuário${emailSelected.size > 1 ? "s" : ""}` : " para todos"}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {/* ── SLIDES ── */}
        {tab === "slides" && (
          <SlidesTab idToken={idToken} />
        )}

        {tab === "analytics" && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Total de pedidos",
                  value: String(orders.length),
                  icon: "📦",
                },
                {
                  label: "Receita total",
                  value: formatBRL(revenue),
                  icon: "💰",
                },
                {
                  label: "Taxa da plataforma",
                  value: formatBRL(platformEarnings),
                  icon: "🔧",
                },
                {
                  label: "Pendentes",
                  value: String(byStatus.pending_payment),
                  icon: "⏳",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700"
                >
                  <p className="text-2xl mb-1">{s.icon}</p>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {s.value}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Revenue chart (last 7 days) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">
                Receita — últimos 7 dias
              </h3>
              <div className="flex items-end gap-2 h-40">
                {last7.map((d) => (
                  <div
                    key={d.label}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <p className="text-[9px] text-slate-400 font-semibold">
                      {d.revenue > 0
                        ? formatBRL(d.revenue).replace("R$ ", "R$")
                        : ""}
                    </p>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-[var(--primary)] to-[var(--secondary)] transition-all"
                      style={{
                        height: `${Math.max((d.revenue / maxRev) * 128, d.revenue > 0 ? 4 : 0)}px`,
                      }}
                    />
                    <p className="text-[9px] text-slate-400 text-center leading-tight">
                      {d.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Status breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
                Pedidos por status
              </h3>
              <div className="space-y-2">
                {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => {
                  const count = byStatus[s];
                  const pct = orders.length
                    ? Math.round((count / orders.length) * 100)
                    : 0;
                  return (
                    <div key={s} className="flex items-center gap-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400 w-28 shrink-0">
                        {STATUS_LABELS[s]}
                      </p>
                      <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-[var(--primary)] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 w-8 text-right">
                        {count}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── CONFIG ── */}
        {tab === "config" && (
          <div className="max-w-2xl space-y-6">
            {/* Branding */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">
                🏷️ Marca
              </h3>
              <div className="space-y-3">
                {(
                  [
                    ["Nome da marca", "brandName", "text"],
                    ["Tagline / slogan", "tagline", "text"],
                  ] as [string, keyof SiteConfig, string][]
                ).map(([label, key, type]) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      {label}
                    </label>
                    <input
                      type={type}
                      value={siteConfig[key] as string}
                      onChange={(e) =>
                        setSiteConfig((c) => ({ ...c, [key]: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Favicon */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                🖼️ Ícone do site (favicon)
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                PNG, JPG ou SVG. Recomendado: 512×512 px. Aparece na aba do
                navegador e em favoritos.
              </p>
              <div className="flex items-center gap-4">
                {siteConfig.faviconUrl ? (
                  <img
                    src={siteConfig.faviconUrl}
                    alt="favicon"
                    className="w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-600 object-cover bg-slate-50"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-2xl bg-slate-50 dark:bg-slate-800">
                    📿
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <input
                    ref={faviconRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadFavicon(f);
                    }}
                  />
                  <button
                    onClick={() => faviconRef.current?.click()}
                    disabled={faviconUploading}
                    className="text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
                  >
                    {faviconUploading ? "Enviando…" : "📁 Escolher imagem"}
                  </button>
                  {siteConfig.faviconUrl && (
                    <button
                      onClick={() =>
                        setSiteConfig((c) => ({ ...c, faviconUrl: "" }))
                      }
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remover
                    </button>
                  )}
                </div>
                {siteConfig.faviconUrl && (
                  <p className="text-[10px] text-slate-400 break-all max-w-xs ml-auto hidden sm:block">
                    {siteConfig.faviconUrl.split("/").pop()}
                  </p>
                )}
              </div>
            </div>

            {/* Social */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">
                📱 Redes Sociais
              </h3>
              <div className="space-y-3">
                {(
                  [
                    ["URL do Instagram", "instagramUrl"],
                    ["URL do Facebook", "facebookUrl"],
                    [
                      "WhatsApp (número E.164, ex: 5511999...)",
                      "whatsappNumber",
                    ],
                    [
                      "WhatsApp (exibição, ex: (11) 9 9999-9999)",
                      "whatsappDisplay",
                    ],
                  ] as [string, keyof SiteConfig][]
                ).map(([label, key]) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={siteConfig[key] as string}
                      onChange={(e) =>
                        setSiteConfig((c) => ({ ...c, [key]: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Legal — URLs */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">
                ⚖️ Legal — URLs
              </h3>
              <div className="space-y-3">
                {(
                  [
                    ["URL dos Termos de Uso", "termsUrl"],
                    ["URL da Política de Privacidade", "privacyUrl"],
                  ] as [string, keyof SiteConfig][]
                ).map(([label, key]) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={siteConfig[key] as string}
                      onChange={(e) =>
                        setSiteConfig((c) => ({ ...c, [key]: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Legal content editor */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">
                📄 Conteúdo Legal
              </h3>

              {/* Tab switcher */}
              <div className="flex gap-1 mb-4 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                {(["terms", "privacy"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setLegalTab(t)}
                    className={`flex-1 text-sm py-1.5 rounded-lg font-semibold transition ${legalTab === t ? "bg-white dark:bg-slate-700 shadow text-[var(--primary)]" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                  >
                    {t === "terms"
                      ? "Termos de Uso"
                      : "Política de Privacidade"}
                  </button>
                ))}
              </div>

              {/* Formatting toolbar */}
              <div className="flex gap-1.5 mb-2">
                {(
                  [
                    ["h2", "H2", "Título (##)"],
                    ["bold", "B", "Negrito (**texto**)"],
                    ["italic", "I", "Itálico (*texto*)"],
                  ] as [
                    Parameters<typeof insertLegalFormat>[0],
                    string,
                    string,
                  ][]
                ).map(([type, label, title]) => (
                  <button
                    key={type}
                    title={title}
                    onClick={() => insertLegalFormat(type)}
                    className={`px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition select-none ${type === "bold" ? "font-bold" : type === "italic" ? "italic font-medium" : "font-bold text-xs"}`}
                  >
                    {label}
                  </button>
                ))}
                <span className="ml-auto text-xs text-slate-400 self-center">
                  ## Título &nbsp;·&nbsp; **negrito** &nbsp;·&nbsp; *itálico*
                </span>
              </div>

              {/* Textarea */}
              <textarea
                ref={legalTextareaRef}
                value={legalTab === "terms" ? termsMarkdown : privacyMarkdown}
                onChange={(e) =>
                  legalTab === "terms"
                    ? setTermsMarkdown(e.target.value)
                    : setPrivacyMarkdown(e.target.value)
                }
                rows={18}
                spellCheck={false}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)] resize-y"
              />
              <p className="text-xs text-slate-400 mt-2">
                O texto é convertido em HTML ao salvar e aparece na página
                correspondente.
              </p>
            </div>

            {/* Theme colors */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                🎨 Cores do tema
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                As variantes escuras (hover) são calculadas automaticamente.
              </p>
              <div className="space-y-4">
                {(
                  [
                    [
                      "Cor primária",
                      "colorPrimary",
                      "Botões, links, destaques",
                    ],
                    [
                      "Cor secundária",
                      "colorSecondary",
                      "CTAs alternativos, ícones",
                    ],
                    [
                      "Cor de destaque",
                      "colorAccent",
                      "Badges, notificações, erros",
                    ],
                  ] as [string, keyof SiteConfig, string][]
                ).map(([label, key, hint]) => (
                  <div key={key} className="flex items-center gap-4">
                    <input
                      type="color"
                      value={siteConfig[key] as string}
                      onChange={(e) =>
                        setSiteConfig((c) => ({ ...c, [key]: e.target.value }))
                      }
                      className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer shrink-0 p-0.5 bg-white dark:bg-slate-800"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {label}
                      </p>
                      <p className="text-xs text-slate-400">
                        {hint} · {siteConfig[key] as string}
                      </p>
                    </div>
                    <div
                      className="w-6 h-6 rounded-full border border-slate-200 ml-auto shrink-0"
                      style={{ backgroundColor: siteConfig[key] as string }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700">
                <div
                  className="h-2"
                  style={{
                    background: `linear-gradient(to right, ${siteConfig.colorPrimary}, ${siteConfig.colorSecondary}, ${siteConfig.colorAccent})`,
                  }}
                />
                <div className="p-3 flex items-center gap-2 bg-slate-50 dark:bg-slate-800">
                  <span className="text-xs font-semibold text-slate-500">
                    Prévia:
                  </span>
                  <button
                    className="text-xs font-bold px-3 py-1.5 rounded-lg text-white"
                    style={{ backgroundColor: siteConfig.colorPrimary }}
                  >
                    Primária
                  </button>
                  <button
                    className="text-xs font-bold px-3 py-1.5 rounded-lg text-white"
                    style={{ backgroundColor: siteConfig.colorSecondary }}
                  >
                    Secundária
                  </button>
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-full text-white"
                    style={{ backgroundColor: siteConfig.colorAccent }}
                  >
                    Badge
                  </span>
                </div>
              </div>
            </div>

            {/* Creator — only visible to Firebase project owners (CREATOR_UIDS env var) */}
            {isCreator && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                  👨‍💻 Criador / Desenvolvedor
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Exibido no rodapé apenas para os e-mails autorizados. Visível
                  somente a quem está na lista.
                </p>
                <div className="space-y-3">
                  {(
                    [
                      ["Nome", "creatorName", "text"],
                      ["URL do Facebook", "creatorFacebook", "text"],
                      [
                        "WhatsApp (número E.164, ex: 5534991545409)",
                        "creatorWhatsapp",
                        "text",
                      ],
                      ["URL do Instagram", "creatorInstagram", "text"],
                    ] as [string, keyof SiteConfig, string][]
                  ).map(([label, key, type]) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        {label}
                      </label>
                      <input
                        type={type}
                        value={siteConfig[key] as string}
                        onChange={(e) =>
                          setSiteConfig((c) => ({
                            ...c,
                            [key]: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]"
                      />
                    </div>
                  ))}

                  {/* Creator logo upload */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                      Logo do criador
                    </label>
                    <div className="flex items-center gap-4">
                      {siteConfig.creatorLogoUrl ? (
                        <img
                          src={siteConfig.creatorLogoUrl}
                          alt="creator logo"
                          className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-600 object-cover bg-slate-50"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 text-xl bg-slate-50 dark:bg-slate-800">
                          👤
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <input
                          ref={creatorLogoRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadCreatorLogo(f);
                          }}
                        />
                        <button
                          onClick={() => creatorLogoRef.current?.click()}
                          disabled={creatorLogoUploading}
                          className="text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
                        >
                          {creatorLogoUploading
                            ? "Enviando…"
                            : "📁 Escolher imagem"}
                        </button>
                        {siteConfig.creatorLogoUrl && (
                          <button
                            onClick={() =>
                              setSiteConfig((c) => ({
                                ...c,
                                creatorLogoUrl: "",
                              }))
                            }
                            className="text-xs text-red-500 hover:underline"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save */}
            <div className="flex items-center gap-3 pb-4">
              <button
                onClick={saveConfig}
                disabled={configSaving}
                className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-semibold px-6 py-2.5 rounded-xl transition disabled:opacity-60"
              >
                {configSaving ? "Salvando…" : "💾 Salvar configurações"}
              </button>
              {configSaved && (
                <span className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ Salvo com sucesso!
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Admin Chat ── */}
      <ChatModal
        open={chatOrderId !== null}
        orderId={chatOrderId ?? ""}
        orderShortId={chatOrderId?.slice(0, 8).toUpperCase()}
        user={adminUser}
        isAdmin
        onClose={() => setChatOrderId(null)}
      />

      {/* ── Product Modal ── */}
      {productModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setProductModal(false)}
          />
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="h-1 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white">
                {productForm.id ? "Editar produto" : "Novo produto"}
              </h3>
              <button
                onClick={() => setProductModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 flex items-center justify-center"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Image */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  Imagem do produto
                </label>
                <div className="flex gap-3 items-start">
                  {(productForm.image || imageFile) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        imageFile
                          ? URL.createObjectURL(imageFile)
                          : productForm.image
                      }
                      alt=""
                      className="w-20 h-20 rounded-xl object-cover border border-slate-200"
                    />
                  )}
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-200 hover:border-[var(--primary)] rounded-xl py-3 text-sm text-slate-400 hover:text-[var(--primary)] transition"
                    >
                      {imageUploading
                        ? "Enviando..."
                        : imageFile
                          ? imageFile.name
                          : "Clique para selecionar imagem"}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        setImageFile(e.target.files?.[0] ?? null)
                      }
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      ou cole a URL abaixo:
                    </p>
                    <input
                      type="text"
                      value={productForm.image}
                      onChange={(e) =>
                        setProductForm((f) => ({ ...f, image: e.target.value }))
                      }
                      placeholder="https://res.cloudinary.com/..."
                      className="mt-1 w-full text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    />
                  </div>
                </div>
              </div>

              {/* Price + badges */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Preço (R$) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={productForm.price || ""}
                    onChange={(e) =>
                      setProductForm((f) => ({
                        ...f,
                        price: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!productForm.popular}
                      onChange={(e) =>
                        setProductForm((f) => ({
                          ...f,
                          popular: e.target.checked,
                        }))
                      }
                      className="accent-[var(--primary)]"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Mais vendido
                    </span>
                  </label>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!productForm.customizable}
                      onChange={(e) =>
                        setProductForm((f) => ({
                          ...f,
                          customizable: e.target.checked,
                        }))
                      }
                      className="accent-[var(--primary)]"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Personalizável
                    </span>
                  </label>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Categoria
                </label>
                <select
                  value={productForm.category ?? ""}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                >
                  <option value="">— Sem categoria —</option>
                  {(liveCats.length > 0
                    ? liveCats.map((c) => ({ slug: c.slug, label: c.label, emoji: c.emoji }))
                    : KNOWN_CATEGORIES.map((c) => ({ slug: c.value, label: c.label, emoji: "" }))
                  ).map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.emoji ? `${c.emoji} ` : ""}{c.label}
                    </option>
                  ))}
                  {/* Show current value as option if it's not in the list */}
                  {productForm.category &&
                    !liveCats.find((c) => c.slug === productForm.category) &&
                    !KNOWN_CATEGORIES.find((c) => c.value === productForm.category) && (
                      <option value={productForm.category}>
                        {productForm.category}
                      </option>
                    )}
                </select>
              </div>

              {/* Names */}
              {(["pt", "fr", "en"] as const).map((lang) => (
                <div key={`name-${lang}`}>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Nome{" "}
                    {lang === "pt"
                      ? "🇧🇷 Português"
                      : lang === "fr"
                        ? "🇭🇹 Français"
                        : "🇺🇸 English"}{" "}
                    *
                  </label>
                  <input
                    type="text"
                    value={productForm.name[lang]}
                    onChange={(e) =>
                      setProductForm((f) => ({
                        ...f,
                        name: { ...f.name, [lang]: e.target.value },
                      }))
                    }
                    className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>
              ))}

              {/* Descriptions */}
              {(["pt", "fr", "en"] as const).map((lang) => (
                <div key={`desc-${lang}`}>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Descrição{" "}
                    {lang === "pt" ? "🇧🇷" : lang === "fr" ? "🇭🇹" : "🇺🇸"} *
                  </label>
                  <textarea
                    rows={2}
                    value={productForm.description[lang]}
                    onChange={(e) =>
                      setProductForm((f) => ({
                        ...f,
                        description: {
                          ...f.description,
                          [lang]: e.target.value,
                        },
                      }))
                    }
                    className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={saveProduct}
                disabled={productSaving || imageUploading}
                className="w-full bg-[var(--primary)] text-white font-bold py-3 rounded-xl hover:bg-[var(--primary-dark)] transition disabled:opacity-60"
              >
                {productSaving || imageUploading
                  ? "Salvando..."
                  : productForm.id
                    ? "Salvar alterações"
                    : "Criar produto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
