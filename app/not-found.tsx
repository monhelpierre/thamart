"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <h1 className="text-5xl font-bold mb-4">404 - Página não encontrada</h1>
      <p className="text-lg mb-6">
        A página que você está procurando não existe.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)]"
      >
        Voltar para a página inicial
      </Link>
    </div>
  );
}
