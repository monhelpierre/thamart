import { useI18n } from "@/lib/i18n";
import {
  PRODUCTS,
  formatBRL,
  type Product,
} from "@/data/products";
import type { AppUser } from "@/lib/firebase";

export type CartMap = Record<string, number>;

interface Props {
  open: boolean;
  products: Product[];
  cart: CartMap;
  notes: string;
  user: AppUser | null;
  onNotes: (v: string) => void;
  onClose: () => void;
  onChangeQty: (id: string, delta: number) => void;
  onCheckout: () => void;
}

export function cartSubtotal(cart: CartMap, products: Product[] = PRODUCTS): number {
  return Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = products.find(x => x.id === id);
    return sum + (p ? p.price * qty : 0);
  }, 0);
}

export default function CartDrawer({
  open,
  products,
  cart,
  notes,
  user,
  onNotes,
  onClose,
  onChangeQty,
  onCheckout,
}: Props) {
  const { t, lang } = useI18n();
  const items = Object.entries(cart).filter(([, q]) => q > 0);
  const subtotal = cartSubtotal(cart, products);

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 right-0 z-[65] h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            🛒 {t("yourCart")}
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 text-xl"
            aria-label="close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">🍽️</div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">{t("emptyCart")}</p>
              <p className="text-sm text-slate-400 mt-1">{t("emptyCartHint")}</p>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {items.map(([id, qty]) => {
                  const p = products.find((x) => x.id === id) ?? null;
                  if (!p) {
                    return (
                      <li key={id} className="flex gap-3 rounded-xl border border-slate-100 dark:border-slate-700 p-2.5 shadow-sm">
                        <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">?</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{t("itemUnavailable") || "Item unavailable"}</p>
                          <p className="text-xs text-slate-400">ID: {id}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <button onClick={() => onChangeQty(id, -1)} className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold">−</button>
                            <span className="text-sm font-semibold w-6 text-center dark:text-white">{qty}</span>
                            <button onClick={() => onChangeQty(id, 1)} className="w-7 h-7 rounded-md bg-[#F3E0F0] hover:bg-[#E9CCE5] text-[#9B2D8F] font-bold">+</button>
                          </div>
                        </div>
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{formatBRL(0)}</p>
                      </li>
                    );
                  }
                  return (
                    <li key={id} className="flex gap-3 rounded-xl border border-slate-100 dark:border-slate-700 p-2.5 shadow-sm">
                      <img src={p.image} alt={p.name[lang]} className="w-16 h-16 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{p.name[lang]}</p>
                        <p className="text-xs text-slate-400">{formatBRL(p.price)}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <button onClick={() => onChangeQty(id, -1)} className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold">−</button>
                          <span className="text-sm font-semibold w-6 text-center dark:text-white">{qty}</span>
                          <button onClick={() => onChangeQty(id, 1)} className="w-7 h-7 rounded-md bg-[#F3E0F0] hover:bg-[#E9CCE5] text-[#9B2D8F] font-bold">+</button>
                        </div>
                      </div>
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{formatBRL(p.price * qty)}</p>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  📝 {t("orderNotesLabel")}
                </label>
                <p className="text-xs text-slate-400 mt-0.5">{t("orderNotesHint")}</p>
                <textarea
                  value={notes}
                  onChange={(e) => onNotes(e.target.value)}
                  placeholder={t("orderNotesPlaceholder")}
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9B2D8F]/40 focus:border-[#9B2D8F] resize-none"
                />
              </div>
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4 bg-slate-50/60 dark:bg-slate-800/60">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>{t("subtotal")}</span>
                <span>{formatBRL(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>{t("deliveryFee")}</span>
                <span className="text-slate-400 text-xs italic">{t("shippingCalcAtCheckout")}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white pt-1">
                <span>{t("subtotal")}</span>
                <span className="text-[#9B2D8F]">{formatBRL(subtotal)}</span>
              </div>
            </div>
            <button
              onClick={onCheckout}
              className="mt-3 w-full rounded-xl bg-[#9B2D8F] hover:bg-[#7A2270] px-4 py-3.5 font-bold text-white transition shadow-lg shadow-purple-500/25"
            >
              {t("continuePay")} →
            </button>
            {!user && (
              <p className="mt-2 text-center text-xs text-slate-400">
                🔒 {t("needLogin")}
              </p>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
