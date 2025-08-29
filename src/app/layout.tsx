import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Elevator Pitch Coach | Practice and Perfect Your Pitch",
  description: "Practice your elevator pitch with AI-powered feedback. Get insights on timing, filler words, and delivery to improve your professional pitch.",
  keywords: ["elevator pitch", "presentation skills", "AI coaching", "speech analysis", "professional development"],
  authors: [{ name: "Dominic DaCosta" }],
  creator: "Dominic DaCosta",
  openGraph: {
    title: "Elevator Pitch Coach",
    description: "Practice and perfect your elevator pitch with AI-powered feedback",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Elevator Pitch Coach",
    description: "Practice and perfect your elevator pitch with AI-powered feedback",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-gray-50 text-gray-900 min-h-screen">
        <div className="relative min-h-screen">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 pointer-events-none" />
          
          {/* Content */}
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
