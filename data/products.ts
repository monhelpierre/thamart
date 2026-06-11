import type { Lang } from "@/lib/i18n";

export interface Product {
  id: string;
  name: Record<Lang, string>;
  description: Record<Lang, string>;
  price: number; // BRL
  image: string;
  popular?: boolean;
  customizable?: boolean;
}

export const PRODUCTS: Product[] = [
  {
    id: "bracelet-fleur",
    name: {
      pt: "Pulseira com Florzinha em Miçanga",
      fr: "Bracelet avec Mini Fleurs en Perles",
      en: "Mini Flower Beaded Bracelet",
    },
    description: {
      pt: "Nossa pulseira mais querida: florzinhas de miçanga feitas à mão com detalhes em dourado e fecho lobster. Escolha sua cor favorita!",
      fr: "Notre bracelet le plus aimé : mini fleurs en perles faites à la main avec détails dorés et fermoir mousqueton. Choisissez votre couleur !",
      en: "Our most loved bracelet: hand-beaded mini flowers with gold accents and a lobster clasp. Pick your favorite color!",
    },
    price: 39.9,
    popular: true,
    customizable: true,
    image: "https://res.cloudinary.com/dos3zvyuj/image/upload/v1781187391/prod8_oadyhk.jpg",
  },
  {
    id: "bracelet-cristal",
    name: {
      pt: "Pulseira de Cristais com Flores",
      fr: "Bracelet en Cristaux à Fleurs",
      en: "Crystal Flower Bracelet",
    },
    description: {
      pt: "Cristais vermelhos em formato de estrela com miçangas brancas e verdes formando flores. Sofisticada e brilhante.",
      fr: "Cristaux rouges en forme d'étoile avec perles blanches et vertes formant des fleurs. Sophistiqué et brillant.",
      en: "Red star-shaped crystals with white and green beads forming flowers. Elegant and sparkling.",
    },
    price: 54.9,
    popular: true,
    image: "https://res.cloudinary.com/dos3zvyuj/image/upload/v1781187390/prod1_grmwt2.jpg",
  },
  {
    id: "colar",
    name: {
      pt: "Colar Choker de Miçanga",
      fr: "Collier Ras-de-cou en Perles",
      en: "Beaded Choker Necklace",
    },
    description: {
      pt: "Choker delicado de miçanga com florzinhas e detalhes dourados. Combina com qualquer look.",
      fr: "Ras-de-cou délicat en perles avec mini fleurs et détails dorés. S'accorde avec toutes les tenues.",
      en: "Delicate beaded choker with little flowers and gold details. Matches any outfit.",
    },
    price: 49.9,
    customizable: true,
    image: "https://res.cloudinary.com/dos3zvyuj/image/upload/v1781187391/prod4_ywdo6t.jpg",
  },
  {
    id: "brincos",
    name: {
      pt: "Brincos de Flor em Miçanga",
      fr: "Boucles d'Oreilles Fleur en Perles",
      en: "Beaded Flower Earrings",
    },
    description: {
      pt: "Par de brincos com florzinhas de miçanga e ganchos dourados. Leves e charmosos.",
      fr: "Paire de boucles d'oreilles avec mini fleurs en perles et crochets dorés. Légères et charmantes.",
      en: "Pair of earrings with beaded mini flowers and gold hooks. Light and charming.",
    },
    price: 29.9,
    image: "https://res.cloudinary.com/dos3zvyuj/image/upload/v1781187391/prod6_jitovl.jpg",
  },
  {
    id: "tornozeleira",
    name: {
      pt: "Tornozeleira de Miçanga",
      fr: "Chaîne de Cheville en Perles",
      en: "Beaded Anklet",
    },
    description: {
      pt: "Tornozeleira colorida com florzinhas, perfeita para o verão. Ajustável e durável.",
      fr: "Chaîne de cheville colorée avec fleurs, parfaite pour l'été. Réglable et résistante.",
      en: "Colorful flower anklet, perfect for summer. Adjustable and durable.",
    },
    price: 34.9,
    customizable: true,
    image: "https://res.cloudinary.com/dos3zvyuj/image/upload/v1781187390/prod2_k2hgst.jpg",
  },
  {
    id: "personalizado",
    name: {
      pt: "Pulseira Personalizada com Nome",
      fr: "Bracelet Personnalisé avec Prénom",
      en: "Personalized Name Bracelet",
    },
    description: {
      pt: "Monte sua pulseira com nome ou palavra em miçanga + florzinhas. Conte os detalhes no pedido!",
      fr: "Composez votre bracelet avec prénom ou mot en perles + fleurs. Précisez les détails dans la commande !",
      en: "Build your bracelet with a name or word in beads + flowers. Tell us the details in your order!",
    },
    price: 44.9,
    customizable: true,
    image: "https://res.cloudinary.com/dos3zvyuj/image/upload/v1781187390/bracelet-crystal_e4dfvl.jpg",
  },
];

export const FACEBOOK_URL =
  "https://www.facebook.com/profile.php?id=100088311606013";

export const INSTAGRAM_URL = "https://www.instagram.com/thamart";

export const FREE_DELIVERY_THRESHOLD = 120;
export const DELIVERY_FEE = 9.9;

export function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
