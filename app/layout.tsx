import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "새결 — 오늘의 결을 입다",
  description: "패션과 뷰티, 오늘의 취향을 발견하는 커머스 새결",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
