"use client";

import Header from "@/components/Header";
import { useEffect, useState, useMemo } from "react";
import CheckoutModal from "@/components/CheckoutModal";
import OrderTrackerModal from "@/components/OrderTrackerModal";
import ReviewModal from "@/components/ReviewModal";
import ProductModal from "@/components/ProductModal";
import AddressPromptModal from "@/components/AddressPromptModal";
import { subscribeAuth, auth, type AppUser } from "@/lib/firebase";
import GoogleSigninModal from "@/components/GoogleSigninModal";
import { Hero, Menu, HowItWorks, About, Footer } from "@/components/Sections";
import CartDrawer, { cartSubtotal, type CartMap } from "@/components/CartDrawer";
import { type Product } from "@/data/products";

export default function Home() {
  const [cart, setCart] = useState<CartMap>({});
  const [notes, setNotes] = useState("");
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

  // Address prompt (shown once after login if no saved address)
  const [addressPromptOpen, setAddressPromptOpen] = useState(false);

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
      try { localStorage.removeItem("session"); } catch { }
      return;
    }

    try {
      localStorage.setItem("session", JSON.stringify(user));
    } catch (e) {
      console.error("localStorage write error", e);
    }

    (async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL }),
        });

        // Check if address prompt should be shown (only once per session)
        if (!sessionStorage.getItem("addressPromptShown")) {
          const profileRes = await fetch(`/api/users?uid=${encodeURIComponent(user.uid)}`, {
            headers: { Authorization: `Bearer ${idToken}` },
          });
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
        const idToken = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/carts?uid=${encodeURIComponent(user.uid)}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
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
        const idToken = await auth.currentUser?.getIdToken();
        await fetch("/api/carts", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ uid: user.uid, cart }),
        });
      } catch (e) {
        console.error("persist cart error", e);
      }
    })();
  }, [cart, user]);

  const cartCount = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);
  const subtotal = useMemo(() => cartSubtotal(cart, products), [cart, products]);

  const addToCart = (id: string, onAdded: () => void) => {
    if (!user) {
      setGoogleSigninOpen(true);
      setPendingAdd(id);
      return;
    }
    setCart(c => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
    onAdded();
  };

  const changeQty = (id: string, delta: number) =>
    setCart(c => {
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
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      <Header
        cartCount={cartCount}
        user={user}
        onOpenCart={() => setCartOpen(true)}
        onOpenOrders={() => { setHighlightOrderId(null); setOrdersOpen(true); }}
        onSignIn={() => setGoogleSigninOpen(true)}
        onSignedOut={handleSignedOut}
        authLoading={authLoading}
      />

      <main>
        <Hero />
        <Menu
          products={products}
          onAdd={(id, onAdded) => addToCart(id, onAdded)}
          onProductClick={(p) => setSelectedProduct(p)}
          isLoading={isLoading}
        />
        <HowItWorks />
        <About />
      </main>

      <Footer />

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

      <GoogleSigninModal
        open={googleSigninOpen}
        onUser={(u) => {
          setUser(u);
          if (pendingAdd) {
            setCart(c => ({ ...c, [pendingAdd]: (c[pendingAdd] ?? 0) + 1 }));
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
