"use client";

import Header from "@/components/Header";
import { useEffect, useState, useMemo } from "react";
import CheckoutModal from "@/components/CheckoutModal";
import OrderTrackerModal from "@/components/OrderTrackerModal";
import ReviewModal from "@/components/ReviewModal";
import ProductModal from "@/components/ProductModal";
import AddressPromptModal from "@/components/AddressPromptModal";
import { subscribeAuth, getAuthToken, db, type AppUser } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import GoogleSigninModal from "@/components/GoogleSigninModal";
import { Hero, Menu, HowItWorks, About, Footer, CategoryBar } from "@/components/Sections";
import CartDrawer, { cartSubtotal, type CartMap } from "@/components/CartDrawer";
import { type Product } from "@/data/products";

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Aguardando pagamento",
  paid: "Pagamento confirmado ✅",
  in_production: "Em produção 🔨",
  shipped: "Enviado 🚚",
  delivered: "Entregue 📦",
};

interface Toast { id: string; message: string }

export default function Home() {
  const [cart, setCart] = useState<CartMap>({});
  const [notes, setNotes] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [googleSigninOpen, setGoogleSigninOpen] = useState(false);
  const [pendingAdd, setPendingAdd] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Order tracking
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [highlightOrderId, setHighlightOrderId] = useState<string | null>(null);

  // Review
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState("");
  const [reviewProductId, setReviewProductId] = useState("");
  const [reviewProductName, setReviewProductName] = useState("");

  // Product modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Category filter (shared between CategoryBar and Menu)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Address prompt (shown once after login if no saved address)
  const [addressPromptOpen, setAddressPromptOpen] = useState(false);

  // Bottom nav: "home" | "catalog" | null (scrolled past catalog)
  const [navSection, setNavSection] = useState<"home" | "catalog" | null>("home");
  useEffect(() => {
    function update() {
      const el = document.getElementById("menu");
      if (!el) return;
      const { top, bottom } = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (bottom <= 0) setNavSection(null);
      else if (top <= vh * 0.6) setNavSection("catalog");
      else setNavSection("home");
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);

  // Modals take priority over scroll-based section
  const activeNavItem = cartOpen ? "cart" : ordersOpen ? "orders" : navSection;

  useEffect(() => {
    try {
      const raw = localStorage.getItem("products");
      if (raw) setProducts(JSON.parse(raw));
      const sess = localStorage.getItem("session");
      if (sess) setUser(JSON.parse(sess));
      const cartRaw = localStorage.getItem("cart");
      if (cartRaw) setCart(JSON.parse(cartRaw));
    } catch (e) {
      console.error("localStorage read error", e);
    }

    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        const prev = localStorage.getItem("products");
        const nextRaw = JSON.stringify(data || []);
        if (prev !== nextRaw) {
          localStorage.setItem("products", nextRaw);
          setProducts(data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    let init = false;
    const unsub = subscribeAuth((u) => {
      setUser(u);
      if (!init) {
        setAuthLoading(false);
        init = true;
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) {
      try {
        localStorage.removeItem("session");
      } catch {}
      return;
    }

    try {
      localStorage.setItem("session", JSON.stringify(user));
    } catch (e) {
      console.error("localStorage write error", e);
    }

    (async () => {
      try {
        const idToken = await getAuthToken();
        if (!idToken) return;
        await fetch("/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
          }),
        });

        // Check if address prompt should be shown (only once per session)
        if (!sessionStorage.getItem("addressPromptShown")) {
          const profileRes = await fetch(
            `/api/users?uid=${encodeURIComponent(user.uid)}`,
            {
              headers: { Authorization: `Bearer ${idToken}` },
            },
          );
          if (profileRes.ok) {
            const profile = await profileRes.json();
            if (!profile?.defaultAddress?.city) {
              setAddressPromptOpen(true);
              sessionStorage.setItem("addressPromptShown", "1");
            }
          }
        }
      } catch (e) {
        console.error("ensure profile error", e);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const idToken = await getAuthToken();
        if (!idToken) return;
        const res = await fetch(
          `/api/carts?uid=${encodeURIComponent(user.uid)}`,
          {
            headers: { Authorization: `Bearer ${idToken}` },
          },
        );
        const json = await res.json();
        if (json && json.cart) {
          const local = localStorage.getItem("cart");
          const serverRaw = JSON.stringify(json.cart || {});
          if (local !== serverRaw) {
            localStorage.setItem("cart", serverRaw);
            setCart(json.cart || {});
          }
        }
      } catch (e) {
        console.error("fetch server cart error", e);
      }
    })();
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(cart));
    } catch (e) {
      console.error("localStorage write cart error", e);
    }

    if (!user) return;

    (async () => {
      try {
        const idToken = await getAuthToken();
        if (!idToken) return;
        await fetch("/api/carts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ uid: user.uid, cart }),
        });
      } catch (e) {
        console.error("persist cart error", e);
      }
    })();
  }, [cart, user]);

  // Order status notifications
  useEffect(() => {
    if (!user) return;
    const prevStatus: Record<string, string> = {};
    const q = query(collection(db, "orders"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        const data = change.doc.data();
        if (change.type === "added") {
          prevStatus[change.doc.id] = data.status;
        } else if (change.type === "modified") {
          const prev = prevStatus[change.doc.id];
          if (prev && prev !== data.status) {
            const id = Math.random().toString(36).slice(2);
            const label = STATUS_LABELS[data.status] ?? data.status;
            setToasts((t) => [...t, { id, message: `Pedido ${change.doc.id.slice(0, 8).toUpperCase()}: ${label}` }]);
            setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
          }
          prevStatus[change.doc.id] = data.status;
        }
      });
    }, () => {});
    return () => unsub();
  }, [user]);

  const cartCount = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);
  const subtotal = useMemo(() => cartSubtotal(cart, products), [cart, products]);

  const addToCart = (id: string, onAdded: () => void) => {
    if (!user) {
      setGoogleSigninOpen(true);
      setPendingAdd(id);
      return;
    }
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
    onAdded();
  };

  const changeQty = (id: string, delta: number) =>
    setCart((c) => {
      const next = Math.max(0, (c[id] ?? 0) + delta);
      const copy = { ...c };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });

  const handleCheckout = () => {
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const handleComplete = (orderId: string) => {
    setCheckoutOpen(false);
    setCart({});
    setNotes("");
    if (orderId) {
      setHighlightOrderId(orderId);
      setOrdersOpen(true);
    }
  };

  const handleReview = (orderId: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    setReviewOrderId(orderId);
    setReviewProductId(productId);
    setReviewProductName(product?.name?.pt ?? "Produto");
    setReviewOpen(true);
  };

  const handleSignedOut = () => {
    setUser(null);
    setCart({});
    setNotes("");
    setCartOpen(false);
    setCheckoutOpen(false);
    setGoogleSigninOpen(false);
    setOrdersOpen(false);
    try {
      localStorage.removeItem("cart");
      localStorage.removeItem("session");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      {/* Full-page loading overlay — same style as cart backdrop */}
      <div
        className={`fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 flex items-center justify-center ${
          isLoading
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="w-12 h-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
      </div>

      <Header
        cartCount={cartCount}
        user={user}
        onOpenCart={() => setCartOpen(true)}
        onOpenOrders={() => {
          setHighlightOrderId(null);
          setOrdersOpen(true);
        }}
        onSignIn={() => setGoogleSigninOpen(true)}
        onSignedOut={handleSignedOut}
        authLoading={authLoading}
      />

      <main>
        <Hero />
        <CategoryBar
          products={products}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
        <Menu
          products={products}
          onAdd={(id, onAdded) => addToCart(id, onAdded)}
          onProductClick={(p) => setSelectedProduct(p)}
          isLoading={isLoading}
          selectedCategory={selectedCategory}
        />
        <HowItWorks />
        <About />
      </main>

      <Footer />

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-[55] bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-100 dark:border-slate-800 flex items-center justify-around px-2 py-2 safe-area-pb">
        <a
          href="#top"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition ${activeNavItem === "home" ? "text-[var(--primary)]" : "text-slate-400 dark:text-slate-500"}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[9px] font-semibold">Início</span>
        </a>
        <a
          href="#menu"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition ${activeNavItem === "catalog" ? "text-[var(--primary)]" : "text-slate-400 dark:text-slate-500"}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span className="text-[9px] font-semibold">Catálogo</span>
        </a>
        {user && (
          <button
            onClick={() => { setHighlightOrderId(null); setOrdersOpen(true); }}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition ${activeNavItem === "orders" ? "text-[var(--primary)]" : "text-slate-400 dark:text-slate-500"}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-[9px] font-semibold">Pedidos</span>
          </button>
        )}
        <button
          onClick={() => setCartOpen(true)}
          className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition ${activeNavItem === "cart" ? "text-[var(--primary)]" : "text-slate-400 dark:text-slate-500"}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {cartCount > 0 && (
            <span className="absolute top-0 right-1 min-w-4 h-4 px-0.5 rounded-full bg-[var(--accent)] text-[9px] font-bold text-white flex items-center justify-center">
              {cartCount}
            </span>
          )}
          <span className="text-[9px] font-semibold">Carrinho</span>
        </button>
      </nav>

      {/* Bottom padding on mobile so content isn't hidden behind the nav */}
      <div className="md:hidden h-16" />

      <CartDrawer
        open={cartOpen}
        cart={cart}
        notes={notes}
        user={user}
        onNotes={setNotes}
        onClose={() => setCartOpen(false)}
        onChangeQty={changeQty}
        onCheckout={handleCheckout}
        products={products}
      />

      <CheckoutModal
        open={checkoutOpen}
        cart={cart}
        notes={notes}
        products={products}
        subtotal={subtotal}
        user={user}
        onClose={() => setCheckoutOpen(false)}
        onComplete={handleComplete}
      />

      <OrderTrackerModal
        open={ordersOpen}
        user={user}
        highlightOrderId={highlightOrderId}
        onClose={() => setOrdersOpen(false)}
        onReview={handleReview}
      />

      <ReviewModal
        open={reviewOpen}
        user={user}
        orderId={reviewOrderId}
        productId={reviewProductId}
        productName={reviewProductName}
        onClose={() => setReviewOpen(false)}
        onSubmitted={() => setReviewOpen(false)}
      />

      <ProductModal
        product={selectedProduct}
        open={selectedProduct !== null}
        onClose={() => setSelectedProduct(null)}
        onAdd={(id, onAdded) => addToCart(id, onAdded)}
      />

      <AddressPromptModal
        open={addressPromptOpen}
        user={user}
        onSaved={() => setAddressPromptOpen(false)}
        onSkip={() => setAddressPromptOpen(false)}
      />

      {/* Order status toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-4 z-[200] flex flex-col gap-2 max-w-xs">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="flex items-start gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl px-4 py-3 animate-[slideIn_0.3s_ease]"
            >
              <span className="text-xl shrink-0">📦</span>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">{toast.message}</p>
              <button
                onClick={() => setToasts((t) => t.filter((x) => x.id !== toast.id))}
                className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <GoogleSigninModal
        open={googleSigninOpen}
        onUser={(u) => {
          setUser(u);
          if (pendingAdd) {
            setCart((c) => ({ ...c, [pendingAdd]: (c[pendingAdd] ?? 0) + 1 }));
            setPendingAdd(null);
          }
        }}
        onClose={() => {
          setGoogleSigninOpen(false);
          setPendingAdd(null);
        }}
      />
    </div>
  );
}
