export interface SiteConfig {
  brandName: string;
  tagline: string;
  instagramUrl: string;
  facebookUrl: string;
  whatsappNumber: string;
  whatsappDisplay: string;
  termsUrl: string;
  privacyUrl: string;
  termsContent: string;
  privacyContent: string;
  faviconUrl: string;
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  creatorName: string;
  creatorLogoUrl: string;
  creatorFacebook: string;
  creatorWhatsapp: string;
  creatorInstagram: string;
}

export const DEFAULT_CONFIG: SiteConfig = {
  brandName: "",
  tagline: "Bijoux en perles africaines",
  instagramUrl: "https://www.instagram.com/_thamart_",
  facebookUrl: "https://www.facebook.com/profile.php?id=100088311606013",
  whatsappNumber: "5511950661507",
  whatsappDisplay: "(11) 9 5066-1507",
  termsUrl: "/terms",
  privacyUrl: "/privacy",
  termsContent: `<h2>1. Aceitação dos Termos</h2>
<p>Ao acessar e utilizar o site da ThamArt, você concorda com estes Termos de Uso. Se não concordar com algum ponto, por favor, não utilize nossos serviços.</p>
<h2>2. Produtos e Pedidos</h2>
<p>Todos os produtos são feitos à mão e podem apresentar pequenas variações. As imagens são ilustrativas. O prazo de produção e entrega varia conforme o estado de destino. Após a confirmação do pagamento via Pix, o pedido entra em produção.</p>
<h2>3. Pagamentos</h2>
<p>Os pagamentos são processados exclusivamente via Pix pelo Mercado Pago. Após geração do QR Code, o pagamento deve ser realizado em até 30 minutos. Pedidos não pagos dentro deste prazo são cancelados automaticamente.</p>
<h2>4. Trocas e Devoluções</h2>
<p>Aceitamos trocas em até 7 dias após o recebimento do produto, conforme o Código de Defesa do Consumidor. O produto deve estar sem uso e em perfeitas condições. Entre em contato pelo Instagram para iniciar o processo.</p>
<h2>5. Propriedade Intelectual</h2>
<p>Todo o conteúdo do site (imagens, textos, design) é propriedade da ThamArt e não pode ser reproduzido sem autorização.</p>`,
  privacyContent: `<h2>1. Dados que Coletamos</h2>
<p>Coletamos apenas os dados necessários para processar seus pedidos: nome, e-mail (via login com Google), endereço de entrega e histórico de compras. Não armazenamos dados de cartão de crédito — pagamentos são processados pelo Mercado Pago.</p>
<h2>2. Como Usamos seus Dados</h2>
<p>Usamos seus dados para processar e entregar pedidos, enviar atualizações de status e melhorar a experiência na plataforma. Não vendemos, alugamos ou compartilhamos seus dados com terceiros para fins comerciais.</p>
<h2>3. Armazenamento e Segurança</h2>
<p>Seus dados são armazenados no Firebase (Google Cloud) com criptografia em trânsito e em repouso. O acesso é restrito por regras de segurança do Firestore.</p>
<h2>4. Seus Direitos (LGPD)</h2>
<p>Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a acessar, corrigir e excluir seus dados a qualquer momento. Entre em contato pelo Instagram para exercer esses direitos.</p>
<h2>5. Cookies</h2>
<p>Utilizamos apenas cookies essenciais para manter sua sessão de login ativa. Não utilizamos cookies de rastreamento ou publicidade.</p>`,
  faviconUrl:
    "https://res.cloudinary.com/dos3zvyuj/image/upload/v1781364816/tharmart_da9naw.jpg",
  colorPrimary: "#9B2D8F",
  colorSecondary: "#1CA8DD",
  colorAccent: "#F3425F",
  creatorName: "NhelTech",
  creatorLogoUrl: "/nheltech-logo.png",
  creatorFacebook: "https://www.facebook.com/nheltech24",
  creatorWhatsapp: "5534991545409",
  creatorInstagram: "https://www.instagram.com/nheltech",
};
