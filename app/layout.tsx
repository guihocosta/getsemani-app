import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Getsêmani · Escalas",
  description: "Escalas dos voluntários da Igreja Getsêmani",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Getsêmani" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Aplica a classe .dark antes do primeiro paint, evitando flash de tema errado.
// Sem tema salvo, escuro (AD-010). O meta theme-color nasce aqui e nao no viewport
// do Next: alterar o que veio do servidor faz o React inserir um segundo meta.
const THEME_INIT_SCRIPT = `
(function () {
  var dark = true;
  try {
    var stored = localStorage.getItem("theme");
    if (stored) dark = stored === "dark";
  } catch (e) {}
  document.documentElement.classList.toggle("dark", dark);
  var meta = document.createElement("meta");
  meta.name = "theme-color";
  meta.content = dark ? "#141518" : "#f4f6f9";
  document.head.appendChild(meta);
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: o script de tema muda a classe do <html> antes do React.
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
