"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { formatBRL } from "@/data/products";

type Tab = "orders" | "users" | "products" | "analytics" | "carts" | "email";
type OrderStatus = "pending_payment" | "paid" | "in_production" | "shipped" | "delivered";

interface Order {
    id: string;
    userId: string;
    items: { productId: string; name: { pt: string }; qty: number; price: number }[];
    subtotal: number;
    deliveryFee: number;
    total: number;
    status: OrderStatus;
    paymentId?: string;
    trackingCode?: string;
    address?: { cep: string; street: string; number: string; city: string; state: string };
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

const EMPTY_PRODUCT: Omit<Product, "id"> = {
    name: { pt: "", fr: "", en: "" },
    description: { pt: "", fr: "", en: "" },
    price: 0,
    image: "",
    popular: false,
    customizable: false,
};

export default function AdminPage() {
    const [ready, setReady] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [tab, setTab] = useState<Tab>("orders");
    const [idToken, setIdToken] = useState<string | null>(null);

    // Orders
    const [orders, setOrders] = useState<Order[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [editingOrder, setEditingOrder] = useState<{ id: string; status: OrderStatus; trackingCode: string } | null>(null);

    // Users
    const [users, setUsers] = useState<UserRow[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);

    // Email
    const [emailSelected, setEmailSelected] = useState<Set<string>>(new Set());
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");
    const [emailSending, setEmailSending] = useState(false);
    const [emailResult, setEmailResult] = useState<{ sent: number; failed: number } | null>(null);

    // Carts
    const [carts, setCarts] = useState<CartRow[]>([]);
    const [cartsLoading, setCartsLoading] = useState(false);
    const [expandedCart, setExpandedCart] = useState<string | null>(null);

    // Products
    const [products, setProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [productForm, setProductForm] = useState<Omit<Product, "id"> & { id?: string }>(EMPTY_PRODUCT);
    const [productModal, setProductModal] = useState(false);
    const [productSaving, setProductSaving] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUploading, setImageUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (!u) { setReady(true); return; }
            const token = await u.getIdToken();
            setIdToken(token);
            // verify admin via a quick probe
            const res = await fetch("/api/admin/orders", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                setIsAdmin(true);
                const data = await res.json();
                setOrders(data);
            }
            setIsAdmin(true);
            setReady(true);
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
                        ? { ...o, status: editingOrder.status, trackingCode: editingOrder.trackingCode }
                        : o
                )
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
            setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, blocked } : u)));
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
            prev.size === users.length ? new Set() : new Set(users.map((u) => u.uid))
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
        const res = await authFetch("/api/admin/upload", { method: "POST", body: fd });
        setImageUploading(false);
        if (!res.ok) { alert("Falha no upload da imagem"); return null; }
        const { url } = await res.json();
        return url;
    }

    async function saveProduct() {
        setProductSaving(true);
        let image = productForm.image;
        if (imageFile) {
            const url = await uploadImage();
            if (!url) { setProductSaving(false); return; }
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
                setProducts((prev) => prev.map((p) => (p.id === productForm.id ? { ...p, ...body, id: p.id } : p)));
            } else {
                setProducts((prev) => [...prev, { ...body, id: saved.id, image } as Product]);
            }
            setProductModal(false);
            setImageFile(null);
        }
        setProductSaving(false);
    }

    async function deleteProduct(id: string) {
        if (!confirm("Excluir produto?")) return;
        const res = await authFetch(`/api/admin/products?id=${id}`, { method: "DELETE" });
        if (res.ok) setProducts((prev) => prev.filter((p) => p.id !== id));
    }

    // Load data when tab changes
    useEffect(() => {
        if (!isAdmin || !idToken) return;
        if (tab === "users" && users.length === 0) loadUsers();
        if (tab === "products" && products.length === 0) loadProducts();
        if (tab === "carts" && carts.length === 0) loadCarts();
        if (tab === "email" && users.length === 0) loadUsers();
    }, [tab, isAdmin, idToken]);

    // ---------- Analytics ----------
    const revenue = orders.reduce((s, o) => s + (o.total ?? 0), 0);
    const platformEarnings = orders
        .filter((o) => ["paid", "in_production", "shipped", "delivered"].includes(o.status))
        .reduce((s, o) => s + ((o as any).platformFee ?? 0), 0);
    const byStatus = Object.fromEntries(
        (["pending_payment", "paid", "in_production", "shipped", "delivered"] as OrderStatus[]).map((s) => [
            s,
            orders.filter((o) => o.status === s).length,
        ])
    ) as Record<OrderStatus, number>;

    // Last 7 days revenue
    const last7: { label: string; revenue: number }[] = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().slice(0, 10);
        return {
            label: d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" }),
            revenue: orders
                .filter((o) => o.createdAt.slice(0, 10) === key)
                .reduce((s, o) => s + (o.total ?? 0), 0),
        };
    });
    const maxRev = Math.max(...last7.map((d) => d.revenue), 1);

    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-10 h-10 rounded-full border-4 border-[#9B2D8F] border-t-transparent animate-spin" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
                <p className="text-2xl font-bold text-slate-700">🔒 Acesso restrito</p>
                <p className="text-slate-500">Você não tem permissão para acessar esta área.</p>
                <a href="/" className="text-[#9B2D8F] underline">← Voltar à loja</a>
            </div>
        );
    }

    const TABS: { key: Tab; label: string; icon: string }[] = [
        { key: "orders", label: "Pedidos", icon: "📦" },
        { key: "users", label: "Usuários", icon: "👥" },
        { key: "products", label: "Produtos", icon: "💎" },
        { key: "carts", label: "Carrinhos", icon: "🛒" },
        { key: "email", label: "E-mails", icon: "✉️" },
        { key: "analytics", label: "Analytics", icon: "📊" },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-400 font-medium">ThamArt</p>
                        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Admin Dashboard</h1>
                    </div>
                    <a href="/" className="text-sm text-[#9B2D8F] hover:underline">← Loja</a>
                </div>
                <div className="max-w-7xl mx-auto px-4 flex gap-1 pb-0">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${tab === t.key
                                ? "border-[#9B2D8F] text-[#9B2D8F]"
                                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                }`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">

                {/* ── ORDERS ── */}
                {tab === "orders" && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Todos os pedidos ({orders.length})</h2>
                            <button onClick={loadOrders} className="text-sm text-[#9B2D8F] hover:underline">
                                {ordersLoading ? "Carregando..." : "↺ Atualizar"}
                            </button>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                                        <tr>
                                            {["Pedido", "Cliente", "Status", "Total", "Data", "Ações"].map((h) => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {orders.map((order) => {
                                            const isEditing = editingOrder?.id === order.id;
                                            return (
                                                <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{order.id.slice(0, 8).toUpperCase()}</td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs max-w-[120px] truncate">{order.userId.slice(0, 12)}…</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
                                                            {STATUS_LABELS[order.status]}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-[#9B2D8F]">{formatBRL(order.total)}</td>
                                                    <td className="px-4 py-3 text-xs text-slate-400">
                                                        {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {isEditing ? (
                                                            <div className="flex flex-col gap-1.5 min-w-[220px]">
                                                                <select
                                                                    value={editingOrder.status}
                                                                    onChange={(e) => setEditingOrder((prev) => prev ? { ...prev, status: e.target.value as OrderStatus } : prev)}
                                                                    className="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#9B2D8F]"
                                                                >
                                                                    {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => (
                                                                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                                                    ))}
                                                                </select>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Código de rastreio"
                                                                    value={editingOrder.trackingCode}
                                                                    onChange={(e) => setEditingOrder((prev) => prev ? { ...prev, trackingCode: e.target.value } : prev)}
                                                                    className="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#9B2D8F]"
                                                                />
                                                                <div className="flex gap-1">
                                                                    <button onClick={saveOrderEdit} className="flex-1 bg-[#9B2D8F] text-white text-xs rounded-lg py-1.5 font-semibold hover:bg-[#7A2270] transition">Salvar</button>
                                                                    <button onClick={() => setEditingOrder(null)} className="flex-1 bg-slate-100 text-slate-600 text-xs rounded-lg py-1.5 font-semibold hover:bg-slate-200 transition">Cancelar</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setEditingOrder({ id: order.id, status: order.status, trackingCode: order.trackingCode ?? "" })}
                                                                className="text-xs text-[#1CA8DD] hover:underline"
                                                            >
                                                                ✏️ Editar
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {orders.length === 0 && (
                                    <div className="text-center py-12 text-slate-400">Nenhum pedido encontrado</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── USERS ── */}
                {tab === "users" && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Usuários ({users.length})</h2>
                            <button onClick={loadUsers} className="text-sm text-[#9B2D8F] hover:underline">
                                {usersLoading ? "Carregando..." : "↺ Atualizar"}
                            </button>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                                        <tr>
                                            {["Nome", "Email", "UID", "Status", "Ações"].map((h) => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {users.map((u) => (
                                            <tr key={u.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                                                <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{u.name || "—"}</td>
                                                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{u.email}</td>
                                                <td className="px-4 py-3 font-mono text-xs text-slate-400">{u.uid.slice(0, 12)}…</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.blocked ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                                                        {u.blocked ? "Bloqueado" : "Ativo"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => toggleBlock(u.uid, !u.blocked)}
                                                        className={`text-xs px-3 py-1 rounded-lg font-semibold transition ${u.blocked
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
                                {users.length === 0 && !usersLoading && (
                                    <div className="text-center py-12 text-slate-400">Nenhum usuário encontrado</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── PRODUCTS ── */}
                {tab === "products" && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Produtos ({products.length})</h2>
                            <button
                                onClick={() => {
                                    setProductForm(EMPTY_PRODUCT);
                                    setImageFile(null);
                                    setProductModal(true);
                                }}
                                className="bg-[#9B2D8F] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#7A2270] transition"
                            >
                                + Novo produto
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {products.map((p) => (
                                <div key={p.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden group">
                                    <div className="aspect-square bg-slate-100 relative overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={p.image} alt={p.name.pt} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="p-3">
                                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm leading-tight truncate">{p.name.pt}</p>
                                        <p className="text-[#9B2D8F] font-bold text-sm mt-0.5">{formatBRL(p.price)}</p>
                                        <div className="flex gap-1 mt-2">
                                            <button
                                                onClick={() => {
                                                    setProductForm({ ...p });
                                                    setImageFile(null);
                                                    setProductModal(true);
                                                }}
                                                className="flex-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg py-1.5 font-semibold text-slate-600 transition"
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                onClick={() => deleteProduct(p.id)}
                                                className="flex-1 text-xs bg-red-50 hover:bg-red-100 rounded-lg py-1.5 font-semibold text-red-600 transition"
                                            >
                                                🗑 Excluir
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {products.length === 0 && !productsLoading && (
                                <div className="col-span-full text-center py-12 text-slate-400">Nenhum produto encontrado</div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── CARTS ── */}
                {tab === "carts" && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                Carrinhos ativos ({carts.length})
                            </h2>
                            <button onClick={loadCarts} className="text-sm text-[#9B2D8F] hover:underline">
                                {cartsLoading ? "Carregando..." : "↺ Atualizar"}
                            </button>
                        </div>

                        <div className="space-y-3">
                            {carts.map((c) => {
                                const isOpen = expandedCart === c.uid;
                                return (
                                    <div key={c.uid} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        {/* Row header */}
                                        <button
                                            className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition"
                                            onClick={() => setExpandedCart(isOpen ? null : c.uid)}
                                        >
                                            {/* User info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">
                                                    {c.userName || "Usuário anônimo"}
                                                </p>
                                                <p className="text-xs text-slate-400 truncate">{c.userEmail || c.uid.slice(0, 16) + "…"}</p>
                                            </div>

                                            {/* Item pills */}
                                            <div className="hidden md:flex items-center gap-1.5 flex-wrap max-w-xs">
                                                {c.items.slice(0, 3).map((item) => (
                                                    <span
                                                        key={item.productId}
                                                        className="px-2 py-0.5 bg-[#F3E0F0] text-[#9B2D8F] text-[10px] font-semibold rounded-full whitespace-nowrap"
                                                    >
                                                        {item.qty}× {item.name.length > 18 ? item.name.slice(0, 18) + "…" : item.name}
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
                                                <p className="font-extrabold text-[#9B2D8F] text-sm">{formatBRL(c.totalValue)}</p>
                                                <p className="text-[10px] text-slate-400">{c.itemCount} {c.itemCount === 1 ? "item" : "itens"}</p>
                                            </div>

                                            {/* Updated */}
                                            <div className="hidden lg:block text-right shrink-0 w-24">
                                                <p className="text-[10px] text-slate-400">
                                                    {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString("pt-BR") : "—"}
                                                </p>
                                            </div>

                                            <span className="text-slate-300 text-lg ml-1">{isOpen ? "▲" : "▼"}</span>
                                        </button>

                                        {/* Expanded item list */}
                                        {isOpen && (
                                            <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-3 dark:bg-slate-900/50">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="text-slate-400 uppercase tracking-wide">
                                                            <th className="pb-2 text-left font-semibold">Produto</th>
                                                            <th className="pb-2 text-center font-semibold w-16">Qtd</th>
                                                            <th className="pb-2 text-right font-semibold w-24">Unitário</th>
                                                            <th className="pb-2 text-right font-semibold w-24">Subtotal</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                                        {c.items.map((item) => (
                                                            <tr key={item.productId}>
                                                                <td className="py-2 text-slate-700 dark:text-slate-300 font-medium">{item.name}</td>
                                                                <td className="py-2 text-center text-slate-500 dark:text-slate-400">{item.qty}</td>
                                                                <td className="py-2 text-right text-slate-500 dark:text-slate-400">{formatBRL(item.price)}</td>
                                                                <td className="py-2 text-right font-bold text-[#9B2D8F]">{formatBRL(item.subtotal)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr className="border-t border-slate-200 dark:border-slate-700">
                                                            <td colSpan={3} className="pt-2 text-right text-slate-500 dark:text-slate-400 font-semibold">Total</td>
                                                            <td className="pt-2 text-right font-extrabold text-[#9B2D8F]">{formatBRL(c.totalValue)}</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {carts.length === 0 && !cartsLoading && (
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-center py-16 text-slate-400">
                                    Nenhum carrinho ativo no momento
                                </div>
                            )}

                            {cartsLoading && (
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-center py-16">
                                    <div className="inline-block w-8 h-8 rounded-full border-4 border-[#9B2D8F] border-t-transparent animate-spin" />
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
                                    className="text-xs text-[#9B2D8F] hover:underline font-semibold"
                                >
                                    {emailSelected.size === users.length && users.length > 0 ? "Desmarcar todos" : "Selecionar todos"}
                                </button>
                            </div>

                            <div className="overflow-y-auto max-h-[420px] divide-y divide-slate-50 dark:divide-slate-800">
                                {usersLoading && (
                                    <div className="text-center py-8 text-slate-400 text-sm animate-pulse">Carregando usuários...</div>
                                )}
                                {!usersLoading && users.length === 0 && (
                                    <div className="text-center py-8 text-slate-400 text-sm">Nenhum usuário</div>
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
                                            className="accent-[#9B2D8F] w-4 h-4 shrink-0"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{u.name || "—"}</p>
                                            <p className="text-xs text-slate-400 truncate">{u.email}</p>
                                        </div>
                                        {u.blocked && (
                                            <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-semibold">Bloqueado</span>
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
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Compor mensagem</h3>
                            </div>

                            <div className="flex-1 p-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Assunto *</label>
                                    <input
                                        type="text"
                                        value={emailSubject}
                                        onChange={(e) => setEmailSubject(e.target.value)}
                                        placeholder="Ex: Novidade na ThamArt 🎀"
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9B2D8F]/40 focus:border-[#9B2D8F]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Corpo (HTML ou texto simples) *</label>
                                    <textarea
                                        value={emailBody}
                                        onChange={(e) => setEmailBody(e.target.value)}
                                        rows={10}
                                        placeholder={`<h2>Olá!</h2>\n<p>Temos uma novidade incrível para você...</p>\n<br>\n<p>Com carinho, ThamArt 📿</p>`}
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9B2D8F]/40 focus:border-[#9B2D8F] resize-none font-mono"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Suporta HTML completo ou texto simples.</p>
                                </div>

                                {/* Result banner */}
                                {emailResult && (
                                    <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${emailResult.failed === -1
                                        ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800"
                                        : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800"
                                        }`}>
                                        {emailResult.failed === -1
                                            ? "Erro ao enviar. Verifique RESEND_API_KEY."
                                            : `✅ ${emailResult.sent} enviado${emailResult.sent !== 1 ? "s" : ""}${emailResult.failed > 0 ? ` · ❌ ${emailResult.failed} falha${emailResult.failed !== 1 ? "s" : ""}` : ""}`}
                                    </div>
                                )}
                            </div>

                            <div className="px-5 pb-5">
                                <button
                                    onClick={sendEmails}
                                    disabled={emailSending || !emailSubject.trim() || !emailBody.trim()}
                                    className="w-full rounded-xl bg-[#9B2D8F] hover:bg-[#7A2270] px-4 py-3 font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                {tab === "analytics" && (
                    <div className="space-y-6">
                        {/* Stat cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: "Total de pedidos", value: String(orders.length), icon: "📦" },
                                { label: "Receita total", value: formatBRL(revenue), icon: "💰" },
                                { label: "Taxa da plataforma", value: formatBRL(platformEarnings), icon: "🔧" },
                                { label: "Pendentes", value: String(byStatus.pending_payment), icon: "⏳" },
                            ].map((s) => (
                                <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                                    <p className="text-2xl mb-1">{s.icon}</p>
                                    <p className="text-xl font-extrabold text-slate-900 dark:text-white">{s.value}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Revenue chart (last 7 days) */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Receita — últimos 7 dias</h3>
                            <div className="flex items-end gap-2 h-40">
                                {last7.map((d) => (
                                    <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                                        <p className="text-[9px] text-slate-400 font-semibold">
                                            {d.revenue > 0 ? formatBRL(d.revenue).replace("R$ ", "R$") : ""}
                                        </p>
                                        <div
                                            className="w-full rounded-t-lg bg-gradient-to-t from-[#9B2D8F] to-[#1CA8DD] transition-all"
                                            style={{ height: `${Math.max((d.revenue / maxRev) * 128, d.revenue > 0 ? 4 : 0)}px` }}
                                        />
                                        <p className="text-[9px] text-slate-400 text-center leading-tight">{d.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Status breakdown */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Pedidos por status</h3>
                            <div className="space-y-2">
                                {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => {
                                    const count = byStatus[s];
                                    const pct = orders.length ? Math.round((count / orders.length) * 100) : 0;
                                    return (
                                        <div key={s} className="flex items-center gap-3">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 w-28 shrink-0">{STATUS_LABELS[s]}</p>
                                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="h-full bg-[#9B2D8F] rounded-full transition-all"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 w-8 text-right">{count}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Product Modal ── */}
            {productModal && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setProductModal(false)} />
                    <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
                        <div className="h-1 bg-gradient-to-r from-[#9B2D8F] to-[#1CA8DD]" />
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="font-bold text-slate-900 dark:text-white">{productForm.id ? "Editar produto" : "Novo produto"}</h3>
                            <button onClick={() => setProductModal(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 flex items-center justify-center">×</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* Image */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Imagem do produto</label>
                                <div className="flex gap-3 items-start">
                                    {(productForm.image || imageFile) && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={imageFile ? URL.createObjectURL(imageFile) : productForm.image}
                                            alt=""
                                            className="w-20 h-20 rounded-xl object-cover border border-slate-200"
                                        />
                                    )}
                                    <div className="flex-1">
                                        <button
                                            type="button"
                                            onClick={() => fileRef.current?.click()}
                                            className="w-full border-2 border-dashed border-slate-200 hover:border-[#9B2D8F] rounded-xl py-3 text-sm text-slate-400 hover:text-[#9B2D8F] transition"
                                        >
                                            {imageUploading ? "Enviando..." : imageFile ? imageFile.name : "Clique para selecionar imagem"}
                                        </button>
                                        <input
                                            ref={fileRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1">ou cole a URL abaixo:</p>
                                        <input
                                            type="text"
                                            value={productForm.image}
                                            onChange={(e) => setProductForm((f) => ({ ...f, image: e.target.value }))}
                                            placeholder="https://res.cloudinary.com/..."
                                            className="mt-1 w-full text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#9B2D8F]"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Price + badges */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Preço (R$) *</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={productForm.price || ""}
                                        onChange={(e) => setProductForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#9B2D8F]"
                                    />
                                </div>
                                <div className="flex items-end pb-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={!!productForm.popular}
                                            onChange={(e) => setProductForm((f) => ({ ...f, popular: e.target.checked }))}
                                            className="accent-[#9B2D8F]"
                                        />
                                        <span className="text-sm text-slate-600 dark:text-slate-400">Mais vendido</span>
                                    </label>
                                </div>
                                <div className="flex items-end pb-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={!!productForm.customizable}
                                            onChange={(e) => setProductForm((f) => ({ ...f, customizable: e.target.checked }))}
                                            className="accent-[#9B2D8F]"
                                        />
                                        <span className="text-sm text-slate-600 dark:text-slate-400">Personalizável</span>
                                    </label>
                                </div>
                            </div>

                            {/* Names */}
                            {(["pt", "fr", "en"] as const).map((lang) => (
                                <div key={`name-${lang}`}>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                        Nome {lang === "pt" ? "🇧🇷 Português" : lang === "fr" ? "🇭🇹 Français" : "🇺🇸 English"} *
                                    </label>
                                    <input
                                        type="text"
                                        value={productForm.name[lang]}
                                        onChange={(e) => setProductForm((f) => ({ ...f, name: { ...f.name, [lang]: e.target.value } }))}
                                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#9B2D8F]"
                                    />
                                </div>
                            ))}

                            {/* Descriptions */}
                            {(["pt", "fr", "en"] as const).map((lang) => (
                                <div key={`desc-${lang}`}>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                        Descrição {lang === "pt" ? "🇧🇷" : lang === "fr" ? "🇭🇹" : "🇺🇸"} *
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={productForm.description[lang]}
                                        onChange={(e) => setProductForm((f) => ({ ...f, description: { ...f.description, [lang]: e.target.value } }))}
                                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#9B2D8F]"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700">
                            <button
                                onClick={saveProduct}
                                disabled={productSaving || imageUploading}
                                className="w-full bg-[#9B2D8F] text-white font-bold py-3 rounded-xl hover:bg-[#7A2270] transition disabled:opacity-60"
                            >
                                {productSaving || imageUploading ? "Salvando..." : productForm.id ? "Salvar alterações" : "Criar produto"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
