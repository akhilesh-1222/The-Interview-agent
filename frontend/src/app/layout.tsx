import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "AI Interview Agent — ABTalks Cohort",
  description: "Curriculum-aware adaptive AI technical interviewer. Personalized to your ABTalks AI engineering cohort learning journey.",
  keywords: ["AI interview", "technical interview", "AI agent", "ABTalks", "cohort"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#020408]">{children}</body>
    </html>
  );
}
