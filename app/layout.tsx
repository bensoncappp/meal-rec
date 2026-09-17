import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import styles from "./layout.module.css";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";

const manrope = Manrope({ subsets: ["latin"], weight: ["500", "700"] });

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
      <body className={manrope.className}>
        <div className={styles.shell}>
          <Sidebar />
          <div className={styles.main}>
            <TopBar />
            <div className={styles.content}>{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}
