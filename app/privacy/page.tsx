import Link from "next/link";

export const metadata = {
    title: "Política de Privacidade — ThamArt Bijoux",
    description: "Política de privacidade e uso de dados da ThamArt Bijoux.",
};

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-white dark:bg-slate-950 px-4 py-16">
            <div className="mx-auto max-w-2xl">
                <Link href="/" className="mb-8 inline-flex items-center gap-1 text-sm text-[#9B2D8F] hover:underline">
                    ← Voltar à loja
                </Link>

                <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">Política de Privacidade</h1>
                <p className="mb-10 text-sm text-slate-400">Última atualização: junho de 2025</p>

                <div className="space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed">
                    <section>
                        <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">1. Dados que Coletamos</h2>
                        <p>Coletamos apenas os dados necessários para processar seus pedidos: nome, endereço de e-mail (via login com Google), endereço de entrega e histórico de compras. Não armazenamos dados de cartão de crédito — pagamentos são processados pelo Mercado Pago.</p>
                    </section>

                    <section>
                        <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">2. Como Usamos seus Dados</h2>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Processar e entregar seus pedidos</li>
                            <li>Enviar atualizações de status do pedido</li>
                            <li>Melhorar a experiência na plataforma</li>
                        </ul>
                        <p className="mt-3">Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins comerciais.</p>
                    </section>

                    <section>
                        <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">3. Armazenamento e Segurança</h2>
                        <p>Seus dados são armazenados no Firebase (Google Cloud) com criptografia em trânsito e em repouso. O acesso é restrito por regras de segurança do Firestore.</p>
                    </section>

                    <section>
                        <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">4. Seus Direitos (LGPD)</h2>
                        <p>Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:</p>
                        <ul className="list-disc list-inside space-y-1 mt-2">
                            <li>Acessar seus dados pessoais</li>
                            <li>Corrigir dados incorretos</li>
                            <li>Solicitar a exclusão dos seus dados</li>
                            <li>Revogar o consentimento a qualquer momento</li>
                        </ul>
                        <p className="mt-3">Para exercer esses direitos, entre em contato pelo Instagram.</p>
                    </section>

                    <section>
                        <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">5. Cookies</h2>
                        <p>Utilizamos apenas cookies essenciais para manter sua sessão de login ativa. Não utilizamos cookies de rastreamento ou publicidade.</p>
                    </section>

                    <section>
                        <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">6. Contato</h2>
                        <p>Dúvidas sobre privacidade? Fale conosco pelo Instagram <a href="https://www.instagram.com/thamart" className="text-[#9B2D8F] hover:underline" target="_blank" rel="noopener noreferrer">@thamart</a>.</p>
                    </section>
                </div>
            </div>
        </main>
    );
}
