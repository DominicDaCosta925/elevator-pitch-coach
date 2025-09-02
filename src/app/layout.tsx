import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Premium font pairing: Plus Jakarta Sans for headings, Inter for body
const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans", 
  weight: ["500", "600", "700", "800"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Elevator Pitch Coach - AI-Powered Practice",
  description: "Practice and perfect your elevator pitch with AI-powered feedback. Generate personalized pitches from your resume and improve with real-time coaching.",
  keywords: ["elevator pitch", "AI coaching", "interview practice", "presentation skills", "resume"],
  authors: [{ name: "Elevator Pitch Coach" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <head>
        {/* Preload critical fonts */}
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          as="style"
        />
        <link
          rel="preload" 
          href="https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;500;600&display=swap"
          as="style"
        />
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" 
          as="style"
        />
      </head>
      <body className={`${inter.variable} ${plusJakartaSans.variable} antialiased font-sans`}>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="dark" 
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-background text-foreground">
            {children}
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}