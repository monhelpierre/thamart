"use client";

import { useSiteConfig, darken } from "@/lib/siteConfig";

export default function ConfigStyle() {
  const cfg = useSiteConfig();
  const css = `:root {
  --primary: ${cfg.colorPrimary};
  --primary-dark: ${darken(cfg.colorPrimary)};
  --secondary: ${cfg.colorSecondary};
  --secondary-dark: ${darken(cfg.colorSecondary)};
  --accent: ${cfg.colorAccent};
}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
