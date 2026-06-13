import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { SiteConfigProvider } from "@/lib/siteConfig";
import ConfigStyle from "@/components/ConfigStyle";
import { getSiteConfigServer } from "@/lib/getSiteConfigServer";

const inter = Inter({ subsets: ["latin"] });

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfigServer();
  return {
    title: cfg.brandName || "ThamArt Bijoux",
    description:
      cfg.tagline || "Artesanato em miçanga – pulseiras, colares e brincos",
    ...(cfg.faviconUrl && {
      icons: { icon: cfg.faviconUrl, shortcut: cfg.faviconUrl },
    }),
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        {/* Default to light theme; respect saved preference */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'light';
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <SiteConfigProvider>
          <ConfigStyle />
          <ThemeProvider>
            <I18nProvider>{children}</I18nProvider>
          </ThemeProvider>
        </SiteConfigProvider>
      </body>
    </html>
  );
}
