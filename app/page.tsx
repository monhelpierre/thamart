"use client";

import { useEffect, useState, useMemo } from "react";
import Header from "@/components/Header";
import CheckoutModal from "@/components/CheckoutModal";
import { subscribeAuth, type AppUser } from "@/lib/firebase";
import { Hero, Menu, HowItWorks, About, Footer } from "@/components/Sections";
import CartDrawer, { cartSubtotal, type CartMap } from "@/components/CartDrawer";
import { FREE_DELIVERY_THRESHOLD, DELIVERY_FEE, type Product } from "@/data/products";

export default function Home() {
  const [cart, setCart] = useState<CartMap>({});
  const [notes, setNotes] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pendingAdd, setPendingAdd] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize products and session from localStorage, fetch and poll for changes
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

    // initial fetch
    fetchProducts();

    // poll for changes every 30s
    const id = setInterval(fetchProducts, 30000);
    return () => clearInterval(id);
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

  // persist session and ensure user profile exists in Firestore
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

    // call server API to upsert profile using Admin SDK (avoids client write rules)
    (async () => {
      try {
        await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL }),
        });
      } catch (e) {
        console.error("ensure profile error", e);
      }
    })();
  }, [user]);

  // when user logs in, fetch server-side cart and merge/replace local cart
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch(`/api/carts?uid=${encodeURIComponent(user.uid)}`);
        const json = await res.json();
        if (json && json.cart) {
          // if server cart differs from local, prefer server
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

  // persist cart locally and to server when user is signed in
  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(cart));
    } catch (e) {
      console.error("localStorage write cart error", e);
    }

    if (!user) return;

    (async () => {
      try {
        await fetch("/api/carts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid, cart }),
        });
      } catch (e) {
        console.error("persist cart error", e);
      }
    })();
  }, [cart, user]);

  const cartCount = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);
  const subtotal = cartSubtotal(cart);
  const delivery = subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = subtotal + delivery;

  const addToCart = (id: string) => {
    if (!user) {
      // ask user to login via checkout modal, remember pending item
      setPendingAdd(id);
      setCheckoutOpen(true);
      return;
    }
    setCart(c => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
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
  const handleComplete = () => {
    setCheckoutOpen(false);
    setCart({});
    setNotes("");
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <Header
        cartCount={cartCount}
        user={user}
        onOpenCart={() => setCartOpen(true)}
        onSignIn={() => setCheckoutOpen(true)}
        onSignedOut={() => {
          // clear user and cart on logout
          setUser(null);
          setCart({});
          setNotes("");
          setCartOpen(false);
          setCheckoutOpen(false);
          try {
            localStorage.removeItem("cart");
            localStorage.removeItem("session");
          } catch (e) {
            /* ignore */
          }
        }}
        authLoading={authLoading}
      />
      <main>
        <Hero />
        <Menu products={products} onAdd={addToCart} isLoading={isLoading} />
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
        total={total > 0 ? total : 0.01}
        user={user}
        onUser={(u) => {
          setUser(u);
          // if there was a pending add, add it now
          if (pendingAdd) {
            setCart(c => ({ ...c, [pendingAdd]: (c[pendingAdd] ?? 0) + 1 }));
            setPendingAdd(null);
          }
        }}
        onClose={() => {
          setCheckoutOpen(false);
          setPendingAdd(null);
        }}
        onComplete={handleComplete}
      />
    </div>
  );
}