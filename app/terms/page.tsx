import Link from "next/link";

export const metadata = {
    title: "Termos de Uso — ThamArt Bijoux",
    description: "Termos e condições de uso da ThamArt Bijoux.",
};

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-white dark:bg-slate-950 px-4 py-16">
            <div className="mx-auto max-w-2xl">
                <Link href="/" className="mb-8 inline-flex items-center gap-1 text-sm text-[#9B2D8F] hover:underline">
                    ← Voltar à loja
                </Link>

                <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">Termos de Uso</h1>
                <p className="mb-10 text-sm text-slate-400">Última atualização: junho de 2025</p>

                <div className="space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed">
                    <section>
                        <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">1. Aceitação dos Termos</h2>
                        <p>Ao acessar e utilizar o site da ThamArt Bijoux, você concorda com estes Termos de Uso. Se não concordar com algum ponto, por favor, não utilize nossos serviços.</p>
                    </section>

                    <section>
                        <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">2. Produtos e Pedidos</h2>
                        <p>Todos os produtos são feitos à mão e podem apresentar pequenas variações. As imagens são ilustrativas. O prazo de produção e entrega varia conforme o estado de destino. Após a confirmação do pagamento via Pix, o pedido entra em produção.</p>
                    </section>

                    <section>
                        <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">3. Pagamentos</h2>
                        <p>Os pagamentos são processados exclusivamente via Pix pelo Mercado Pago. Após geração do QR Code, o pagamento deve ser realizado em até 30 minutos. Pedidos não pagos dentro deste prazo são cancelados automaticamente.</p>
                    </section>

                    <section>
                        <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">4. Trocas e Devoluções</h2>
                        <p>Aceitamos trocas em até 7 dias após o recebimento do produto, conforme o Código de Defesa do Consumidor. O produto deve estar sem uso e em perfeitas condições. Entre em contato pelo Instagram para iniciar o processo.</p>
                    </section>

                    <section>
                        <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">5. Propriedade Intelectual</h2>
                        <p>Todo o conteúdo do site (imagens, textos, design) é propriedade da ThamArt Bijoux e não pode ser reproduzido sem autorização.</p>
                    </section>

                    <section>
                        <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">6. Contato</h2>
                        <p>Dúvidas? Fale conosco pelo Instagram <a href="https://www.instagram.com/thamart" className="text-[#9B2D8F] hover:underline" target="_blank" rel="noopener noreferrer">@thamart</a>.</p>
                    </section>
                </div>
            </div>
        </main>
    );
}
