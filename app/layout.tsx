import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ThamArt Bijoux",
  description: "Artesanato em miçanga – pulseiras, colares e brincos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme on first load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||((window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})()`,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <I18nProvider>{children}</I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
