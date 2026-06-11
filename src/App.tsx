import { useEffect, useMemo, useState } from "react";
import { I18nProvider } from "./i18n";
import Header from "./components/Header";
import { Hero, Menu, HowItWorks, About, Footer } from "./components/Sections";
import CartDrawer, { cartSubtotal, type CartMap } from "./components/CartDrawer";
import CheckoutModal from "./components/CheckoutModal";
import { subscribeAuth, type AppUser } from "./lib/firebase";
import { FREE_DELIVERY_THRESHOLD, DELIVERY_FEE } from "./data/products";

function Shop() {
  const [cart, setCart] = useState<CartMap>({});
  const [notes, setNotes] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => subscribeAuth(setUser), []);

  const cartCount = useMemo(
    () => Object.values(cart).reduce((a, b) => a + b, 0),
    [cart]
  );

  const subtotal = cartSubtotal(cart);
  const delivery =
    subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = subtotal + delivery;

  const addToCart = (id: string) =>
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));

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
        onSignedOut={() => setUser(null)}
      />
      <main>
        <Hero />
        <Menu onAdd={addToCart} />
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
      />

      <CheckoutModal
        open={checkoutOpen}
        total={total > 0 ? total : 0.01}
        user={user}
        onUser={setUser}
        onClose={() => setCheckoutOpen(false)}
        onComplete={handleComplete}
      />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <Shop />
    </I18nProvider>
  );
}
