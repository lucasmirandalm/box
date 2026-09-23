import type { Metadata } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";

const mPlusRounded = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-m-plus-rounded",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Box",
  description: "Desenhe e crie junto com outras pessoas em tempo real.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${mPlusRounded.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}