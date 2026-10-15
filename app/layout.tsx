import type { Metadata } from "next";
import { Inter, Lobster } from "next/font/google";
import "./globals.css";
import styles from "./layout.module.css";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import { Suspense } from "react";


const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const lobster = Lobster({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-logo",
});

export const metadata: Metadata = {
  title: "Meal Prep Generator",
  description: "Generate meal plans to hit your calorie and macro targets.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${lobster.variable}`}>
        <div className={styles.shell}>
          <Sidebar />
          <div className={styles.main}>
            <Suspense fallback={null}>
              <TopBar />
            </Suspense>
            <div className={styles.content}>{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}