import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-body" 
});

const manrope = Manrope({ 
  subsets: ["latin"], 
  variable: "--font-heading" 
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
    <html lang="en" className={`${inter.variable} ${manrope.variable} dark`}>
      <body className="bg-background text-foreground">
        <ThemeProvider 
          attribute="class" 
          defaultTheme="dark" 
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}