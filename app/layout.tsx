import type { Metadata, Viewport } from "next";
import { loadDeck } from "@/lib/deck";
import "./globals.css";

const deck = loadDeck();

export const metadata: Metadata = {
  title: deck.title,
  description: "สไลด์แนะแนว Programming: ประวัติ paradigm จาก C ถึง Rust, เริ่มต้นสายแอป เว็บ เกม, สมองเรียนรู้ยังไง และการซ้อมแข่ง",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111111",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {deck.fontLinks.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
