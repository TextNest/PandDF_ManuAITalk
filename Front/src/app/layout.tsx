import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ToastContainer from '@/components/ui/Toast/Toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ManuAI-Talk',
  description: 'AI 기반 제품 설명서 질의응답 시스템',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}