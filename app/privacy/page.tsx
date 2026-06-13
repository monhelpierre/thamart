import Link from "next/link";
import { getSiteConfigServer } from "@/lib/getSiteConfigServer";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const cfg = await getSiteConfigServer();
  return {
    title: `Política de Privacidade — ${cfg.brandName || "ThamArt"}`,
    description: "Política de privacidade e uso de dados.",
  };
}

export default async function PrivacyPage() {
  const cfg = await getSiteConfigServer();
  const content = cfg.privacyContent;

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-8 inline-flex items-center gap-1 text-sm text-[var(--primary)] hover:underline">
          ← Voltar à loja
        </Link>
        <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">Política de Privacidade</h1>
        <p className="mb-10 text-sm text-slate-400">Última atualização: {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p>
        <div
          className="space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed prose dark:prose-invert max-w-none
            [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:dark:text-white [&_h2]:mb-2
            [&_p]:mt-2 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1 [&_a]:text-[var(--primary)] [&_a]:hover:underline"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </main>
  );
}
