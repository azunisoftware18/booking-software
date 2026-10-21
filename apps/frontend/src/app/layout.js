import { Carlito } from "next/font/google";
import "./globals.css";
import Providers from "@/providers";

// ✅ Calibri-compatible font (cross-platform)
const carlito = Carlito({
  variable: "--font-carlito",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata = {
  title: "Science Park | Learn, Discover, Play",
  description: "Book your visit to an interactive science and discovery park.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${carlito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
