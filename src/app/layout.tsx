import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Figma design tokens: Manrope for headings, Inter for body
const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: 'swap',
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700", "800"],
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
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${manrope.variable} dark`}>
      <head>
        {/* Preload critical fonts */}
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          as="style"
        />
        <link
          rel="preload" 
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
          as="style"
        />
      </head>
      <body className={`${inter.variable} ${manrope.variable} antialiased font-body`}>
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