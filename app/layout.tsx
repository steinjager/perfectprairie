import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.perfectprairie.com"),
  title: "Perfect Prairie | Native Landscapes in Central Illinois",
  description: "Consultation, native landscape design and installation, and prairie or wildflower plots for Central Illinois.",
  icons: { icon: "/favicon.ico", shortcut: "/favicon.ico" },
  alternates: { canonical: "/" },
  openGraph: {
    title: "Perfect Prairie",
    description: "Less lawn. More habitat.",
    url: "https://www.perfectprairie.com",
    siteName: "Perfect Prairie",
    type: "website",
    images: [{ url: "/og-perfect-prairie.png", width: 1200, height: 630, alt: "Perfect Prairie — Less lawn. More habitat." }],
  },
  twitter: { card: "summary_large_image", title: "Perfect Prairie", description: "Less lawn. More habitat.", images: ["/og-perfect-prairie.png"] },
};

export const viewport: Viewport = { themeColor: "#183a2a", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
