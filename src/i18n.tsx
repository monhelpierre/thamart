import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "pt" | "fr" | "en";

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "pt", label: "Português (BR)", flag: "🇧🇷" },
  { code: "fr", label: "Français", flag: "🇭🇹" },
  { code: "en", label: "English (US)", flag: "🇺🇸" },
];

type Dict = Record<string, string>;

const pt: Dict = {
  brand: "ThamArt bijoux",
  tagline: "Bijuterias artesanais em miçanga",
  navMenu: "Produtos",
  navHow: "Como funciona",
  navAbout: "Sobre nós",
  navContact: "Contato",
  heroBadge: "Feito à mão • Pagamento via Pix",
  heroTitle: "Bijuterias artesanais com florzinhas em miçanga",
  heroSubtitle:
    "Pulseiras, colares e brincos feitos à mão, peça por peça, com muito carinho. Monte seu pedido, personalize e pague com Pix.",
  heroCta: "Ver produtos",
  heroCta2: "Como funciona",
  statOrders: "Peças vendidas",
  statDishes: "Modelos exclusivos",
  statCommunity: "Feito à mão",
  menuTitle: "Nossas peças",
  menuSubtitle:
    "Cada peça é feita à mão com miçangas de alta qualidade. Adicione ao carrinho e personalize seu pedido!",
  popular: "Mais vendido",
  custom: "Personalizável",
  addToCart: "Adicionar",
  added: "Adicionado ✓",
  howTitle: "Como fazer seu pedido",
  howSubtitle: "Simples e rápido. Em 4 passos sua bijuteria chega até você.",
  step1Title: "Escolha as peças",
  step1Text: "Navegue pelos modelos e adicione suas favoritas ao carrinho.",
  step2Title: "Descreva o pedido",
  step2Text:
    "Escreva as instruções: cores, tamanho do pulso, nome para personalizar e observações.",
  step3Title: "Entre com o Google",
  step3Text: "Conecte sua conta Google para confirmar quem está fazendo o pedido.",
  step4Title: "Pague com Pix",
  step4Text: "Escaneie o QR Code ou copie o código Pix. Confirmação na hora!",
  aboutTitle: "Sobre a ThamArt",
  aboutText:
    "A ThamArt bijoux nasceu do amor pelo artesanato em miçanga. Cada pulseira, colar e brinco é feito à mão, peça por peça, com cuidado e atenção aos detalhes. Acompanhe nossa página no Facebook para ver as novidades, cores disponíveis e encomendas especiais.",
  followFacebook: "Seguir no Facebook",
  followInstagram: "Seguir no Instagram",
  cart: "Carrinho",
  yourCart: "Seu pedido",
  emptyCart: "Seu carrinho está vazio",
  emptyCartHint: "Adicione peças da nossa coleção para começar seu pedido.",
  orderNotesLabel: "Instruções do pedido",
  orderNotesPlaceholder:
    "Ex.: Pulseira de florzinha na cor rosa, tamanho 17cm. Pulseira personalizada com o nome 'Ana'. Entregar na Rua das Flores 123. Embalar para presente...",
  orderNotesHint: "Descreva cores, tamanhos, nomes para personalizar e endereço.",
  subtotal: "Subtotal",
  deliveryFee: "Entrega",
  free: "Grátis",
  total: "Total",
  continuePay: "Continuar para pagamento",
  needLogin: "É preciso entrar para pagar",
  signIn: "Entrar",
  signOut: "Sair",
  loginTitle: "Conecte-se para continuar",
  loginText:
    "Para confirmar o pedido e gerar o Pix, entre com sua conta Google. Assim sabemos quem está fazendo o pedido.",
  continueGoogle: "Continuar com o Google",
  signingIn: "Conectando...",
  payTitle: "Pague com Pix",
  payAmount: "Valor",
  payOrder: "Pedido",
  scanQr: "Escaneie o QR Code com o app do seu banco",
  orCopy: "ou use o Pix Copia e Cola",
  copyCode: "Copiar código Pix",
  copied: "Código copiado! ✓",
  afterPay: "Após pagar, toque no botão abaixo para confirmar.",
  confirmPaid: "Já fiz o pagamento",
  successTitle: "Pedido recebido! 🎉",
  successText:
    "Obrigada! Assim que o Pix for confirmado, vamos preparar sua bijuteria com todo carinho e avisar pelo e-mail da sua conta Google. Acompanhe nossa página no Facebook!",
  backShop: "Voltar à loja",
  groupBannerTitle: "Compre em conjunto e economize",
  groupBannerText:
    "Pedidos acima de R$ 120 têm entrega grátis. Junte suas peças favoritas e pague com Pix!",
  footerRights: "Todos os direitos reservados.",
  footerNote: "Página publicitária e de pedidos das nossas bijuterias artesanais.",
  demoNotice:
    "Modo demonstração: login do Google simulado (configure o Firebase para produção).",
};

const fr: Dict = {
  brand: "ThamArt bijoux",
  tagline: "Bijoux artisanaux en perles",
  navMenu: "Produits",
  navHow: "Comment ça marche",
  navAbout: "À propos",
  navContact: "Contact",
  heroBadge: "Fait main • Paiement par Pix",
  heroTitle: "Bijoux artisanaux avec mini fleurs en perles",
  heroSubtitle:
    "Bracelets, colliers et boucles d'oreilles faits main, pièce par pièce, avec beaucoup d'amour. Composez votre commande, personnalisez et payez par Pix.",
  heroCta: "Voir les produits",
  heroCta2: "Comment ça marche",
  statOrders: "Pièces vendues",
  statDishes: "Modèles exclusifs",
  statCommunity: "Fait main",
  menuTitle: "Nos pièces",
  menuSubtitle:
    "Chaque pièce est faite main avec des perles de haute qualité. Ajoutez au panier et personnalisez votre commande !",
  popular: "Meilleure vente",
  custom: "Personnalisable",
  addToCart: "Ajouter",
  added: "Ajouté ✓",
  howTitle: "Comment passer commande",
  howSubtitle: "Simple et rapide. En 4 étapes, votre bijou arrive chez vous.",
  step1Title: "Choisissez les pièces",
  step1Text: "Parcourez les modèles et ajoutez vos préférés au panier.",
  step2Title: "Décrivez la commande",
  step2Text:
    "Écrivez les instructions : couleurs, tour de poignet, prénom à personnaliser et remarques.",
  step3Title: "Connectez-vous avec Google",
  step3Text: "Connectez votre compte Google pour confirmer qui passe la commande.",
  step4Title: "Payez par Pix",
  step4Text: "Scannez le QR Code ou copiez le code Pix. Confirmation immédiate !",
  aboutTitle: "À propos de ThamArt",
  aboutText:
    "ThamArt bijoux est né de l'amour de l'artisanat en perles. Chaque bracelet, collier et boucle d'oreille est fait main, pièce par pièce, avec soin et attention aux détails. Suivez notre page Facebook pour découvrir les nouveautés, les couleurs disponibles et les commandes spéciales.",
  followFacebook: "Suivre sur Facebook",
  followInstagram: "Suivre sur Instagram",
  cart: "Panier",
  yourCart: "Votre commande",
  emptyCart: "Votre panier est vide",
  emptyCartHint: "Ajoutez des pièces de notre collection pour commencer.",
  orderNotesLabel: "Instructions de la commande",
  orderNotesPlaceholder:
    "Ex. : Bracelet à fleurs en rose, taille 17cm. Bracelet personnalisé avec le prénom 'Ana'. Livrer au 123 Rue des Fleurs. Emballer en cadeau...",
  orderNotesHint: "Décrivez couleurs, tailles, prénoms à personnaliser et adresse.",
  subtotal: "Sous-total",
  deliveryFee: "Livraison",
  free: "Gratuit",
  total: "Total",
  continuePay: "Continuer vers le paiement",
  needLogin: "Connexion requise pour payer",
  signIn: "Se connecter",
  signOut: "Se déconnecter",
  loginTitle: "Connectez-vous pour continuer",
  loginText:
    "Pour confirmer la commande et générer le Pix, connectez-vous avec votre compte Google. Ainsi nous savons qui passe la commande.",
  continueGoogle: "Continuer avec Google",
  signingIn: "Connexion...",
  payTitle: "Payez par Pix",
  payAmount: "Montant",
  payOrder: "Commande",
  scanQr: "Scannez le QR Code avec l'app de votre banque",
  orCopy: "ou utilisez le Pix Copier-Coller",
  copyCode: "Copier le code Pix",
  copied: "Code copié ! ✓",
  afterPay: "Après le paiement, appuyez sur le bouton ci-dessous pour confirmer.",
  confirmPaid: "J'ai payé",
  successTitle: "Commande reçue ! 🎉",
  successText:
    "Merci ! Dès que le Pix sera confirmé, nous préparerons votre bijou avec soin et vous préviendrons par l'e-mail de votre compte Google. Suivez notre page Facebook !",
  backShop: "Retour à la boutique",
  groupBannerTitle: "Achetez ensemble et économisez",
  groupBannerText:
    "Commandes de plus de R$ 120 : livraison gratuite. Réunissez vos pièces préférées et payez par Pix !",
  footerRights: "Tous droits réservés.",
  footerNote: "Page publicitaire et de commande de nos bijoux artisanaux.",
  demoNotice:
    "Mode démo : connexion Google simulée (configurez Firebase pour la production).",
};

const en: Dict = {
  brand: "ThamArt bijoux",
  tagline: "Handmade beaded jewelry",
  navMenu: "Products",
  navHow: "How it works",
  navAbout: "About us",
  navContact: "Contact",
  heroBadge: "Handmade • Pix payment",
  heroTitle: "Handmade jewelry with mini flowers in beads",
  heroSubtitle:
    "Bracelets, necklaces and earrings made by hand, piece by piece, with lots of love. Build your order, personalize it and pay with Pix.",
  heroCta: "See products",
  heroCta2: "How it works",
  statOrders: "Pieces sold",
  statDishes: "Exclusive designs",
  statCommunity: "Handmade",
  menuTitle: "Our pieces",
  menuSubtitle:
    "Each piece is handmade with high-quality beads. Add to cart and personalize your order!",
  popular: "Best seller",
  custom: "Customizable",
  addToCart: "Add to cart",
  added: "Added ✓",
  howTitle: "How to place your order",
  howSubtitle: "Simple and quick. Your jewelry arrives in 4 steps.",
  step1Title: "Choose the pieces",
  step1Text: "Browse the designs and add your favorites to the cart.",
  step2Title: "Describe your order",
  step2Text:
    "Write the instructions: colors, wrist size, name to personalize and any notes.",
  step3Title: "Sign in with Google",
  step3Text: "Connect your Google account so we know who's placing the order.",
  step4Title: "Pay with Pix",
  step4Text: "Scan the QR Code or copy the Pix code. Instant confirmation!",
  aboutTitle: "About ThamArt",
  aboutText:
    "ThamArt bijoux was born from a love of beadwork. Every bracelet, necklace and pair of earrings is made by hand, piece by piece, with care and attention to detail. Follow our Facebook page to see new arrivals, available colors and special orders.",
  followFacebook: "Follow on Facebook",
  followInstagram: "Follow on Instagram",
  cart: "Cart",
  yourCart: "Your order",
  emptyCart: "Your cart is empty",
  emptyCartHint: "Add pieces from our collection to start your order.",
  orderNotesLabel: "Order instructions",
  orderNotesPlaceholder:
    "E.g.: Flower bracelet in pink, size 17cm. Personalized bracelet with the name 'Ana'. Deliver to 123 Flower St. Gift wrap please...",
  orderNotesHint: "Describe colors, sizes, names to personalize and address.",
  subtotal: "Subtotal",
  deliveryFee: "Delivery",
  free: "Free",
  total: "Total",
  continuePay: "Continue to payment",
  needLogin: "Sign in required to pay",
  signIn: "Sign in",
  signOut: "Sign out",
  loginTitle: "Connect to continue",
  loginText:
    "To confirm the order and generate the Pix code, sign in with your Google account so we know who's placing the order.",
  continueGoogle: "Continue with Google",
  signingIn: "Signing in...",
  payTitle: "Pay with Pix",
  payAmount: "Amount",
  payOrder: "Order",
  scanQr: "Scan the QR Code with your bank app",
  orCopy: "or use Pix Copy & Paste",
  copyCode: "Copy Pix code",
  copied: "Code copied! ✓",
  afterPay: "After paying, tap the button below to confirm.",
  confirmPaid: "I have paid",
  successTitle: "Order received! 🎉",
  successText:
    "Thank you! As soon as the Pix is confirmed we'll craft your jewelry with care and notify you via your Google account e-mail. Follow our Facebook page!",
  backShop: "Back to shop",
  groupBannerTitle: "Buy together and save",
  groupBannerText:
    "Orders over R$ 120 get free delivery. Bundle your favorite pieces and pay with Pix!",
  footerRights: "All rights reserved.",
  footerNote: "Promotional & ordering page for our handmade jewelry.",
  demoNotice:
    "Demo mode: simulated Google sign-in (configure Firebase for production).",
};

const dicts: Record<Lang, Dict> = { pt, fr, en };

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const Ctx = createContext<I18nCtx>({
  lang: "pt",
  setLang: () => { },
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("pt");
  const t = (key: string) => dicts[lang][key] ?? dicts.en[key] ?? key;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
