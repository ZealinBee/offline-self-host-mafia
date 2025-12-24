import type { Metadata } from "next";
import { Cinzel, Geist_Mono } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mafia - The Game of Deception",
  description: "A self-hosted multiplayer Mafia game. Create or join a room, deceive your friends, and survive the night.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${cinzel.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
