"use client";

import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db, getAuthToken, type AppUser } from "@/lib/firebase";

interface Message {
    id: string;
    uid: string;
    userName: string;
    role: "user" | "admin";
    text?: string;
    imageUrl?: string;
    createdAt: string;
}

interface Props {
    open: boolean;
    orderId: string;
    orderShortId?: string;
    user: AppUser | null;
    isAdmin?: boolean;
    onClose: () => void;
}

export default function ChatModal({ open, orderId, orderShortId, user, isAdmin = false, onClose }: Props) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // Realtime messages listener
    useEffect(() => {
        if (!open || !orderId) return;
        setMessages([]);
        const q = query(
            collection(db, "chats", orderId, "messages"),
            orderBy("createdAt", "asc")
        );
        const unsub = onSnapshot(q, (snap) => {
            setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
        });
        return unsub;
    }, [open, orderId]);

    // Mark messages as read whenever the modal opens
    useEffect(() => {
        if (!open || !orderId || !user) return;
        getAuthToken().then((token) => {
            if (!token) return;
            fetch(`/api/chat?orderId=${encodeURIComponent(orderId)}`, {
                headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
        });
    }, [open, orderId, user]);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 100);
    }, [open]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function send(imageUrl?: string) {
        const text = input.trim();
        if ((!text && !imageUrl) || sending || !user) return;
        setSending(true);
        if (!imageUrl) setInput("");
        try {
            const idToken = await getAuthToken();
            await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ orderId, text: text || undefined, imageUrl }),
            });
        } catch (e) {
            console.error("send message error", e);
        } finally {
            setSending(false);
        }
    }

    async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        e.target.value = "";
        setUploadingImage(true);
        try {
            const idToken = await getAuthToken();
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/chat/upload", {
                method: "POST",
                headers: { Authorization: `Bearer ${idToken}` },
                body: fd,
            });
            if (!res.ok) throw new Error("upload failed");
            const { url } = await res.json();
            await send(url);
        } catch (e) {
            console.error("image upload error", e);
        } finally {
            setUploadingImage(false);
        }
    }

    if (!open) return null;

    const shortId = orderShortId ?? orderId.slice(0, 8).toUpperCase();

    return (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md max-h-[90vh] rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
                <div className="h-1 bg-gradient-to-r from-[#9B2D8F] via-[#1CA8DD] to-[#9B2D8F]" />

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                            💬 Chat — Pedido #{shortId}
                        </p>
                        {isAdmin && (
                            <p className="text-[10px] text-slate-400">Respondendo como admin</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 flex items-center justify-center text-lg"
                    >
                        ×
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 min-h-[200px]">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm gap-2">
                            <span className="text-3xl">💬</span>
                            <p>Nenhuma mensagem ainda. Diga olá!</p>
                        </div>
                    )}
                    {messages.map((msg) => {
                        const mine = isAdmin ? msg.role === "admin" : msg.role === "user";
                        return (
                            <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${mine
                                        ? "bg-[#9B2D8F] text-white rounded-br-sm"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm"
                                    }`}
                                >
                                    {!mine && (
                                        <p className="text-[10px] font-bold mb-0.5 opacity-70">
                                            {msg.role === "admin" ? "ThamArt" : msg.userName}
                                        </p>
                                    )}
                                    {msg.imageUrl && (
                                        <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                                            <img
                                                src={msg.imageUrl}
                                                alt="imagem"
                                                className="rounded-xl max-w-[220px] mb-1.5 cursor-pointer hover:opacity-90 transition"
                                            />
                                        </a>
                                    )}
                                    {msg.text && <p>{msg.text}</p>}
                                    <p className={`text-[9px] mt-1 ${mine ? "text-white/60" : "text-slate-400"} text-right`}>
                                        {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex gap-2 items-center">
                    {/* Hidden file input */}
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImagePick}
                    />
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploadingImage || sending}
                        title="Enviar imagem"
                        className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 flex items-center justify-center text-base disabled:opacity-40 transition"
                    >
                        {uploadingImage ? (
                            <span className="animate-spin text-xs">⏳</span>
                        ) : "📷"}
                    </button>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                        placeholder="Digite uma mensagem..."
                        maxLength={1000}
                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2D8F]/40 focus:border-[#9B2D8F]"
                    />
                    <button
                        onClick={() => send()}
                        disabled={!input.trim() || sending}
                        className="rounded-xl bg-[#9B2D8F] hover:bg-[#7A2270] disabled:opacity-50 text-white px-4 py-2 font-bold transition"
                    >
                        {sending ? "..." : "→"}
                    </button>
                </div>
            </div>
        </div>
    );
}
