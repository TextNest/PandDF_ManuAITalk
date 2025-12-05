// ============================================
// 📄 src/components/product/QRCodeDisplay/QRCodeDisplay.tsx
// ============================================
// QR 코드 표시 및 다운로드 컴포넌트
// ============================================

'use client';

import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, Copy, ExternalLink } from 'lucide-react';
import Button from '@/components/ui/Button/Button';
import styles from './QRCodeDisplay.module.css';

interface QRCodeDisplayProps {
  productId: string | null | undefined;
  productName: string | null | undefined;
  size?: number;
}

export default function QRCodeDisplay({ 
  productId, 
  productName,
  size = 200 
}: QRCodeDisplayProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  
  // QR 코드가 가리킬 URL
  const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/chat/${productId}`;

  // QR 코드 다운로드
  const handleDownload = () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    // SVG를 이미지로 변환
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = size;
    canvas.height = size;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      // 다운로드 트리거
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR_${productName}_${productId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // 인쇄
  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=600,height=600');
    if (!printWindow) return;

    const svg = qrRef.current?.querySelector('svg')?.outerHTML;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>QR 코드 - ${productName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .container {
              text-align: center;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 20px;
            }
            .qr-wrapper {
              margin: 20px 0;
            }
            .url {
              font-size: 14px;
              color: #666;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${productName}</h1>
            <div class="qr-wrapper">${svg}</div>
            <p class="url">${qrUrl}</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // URL 복사
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      alert('URL이 클립보드에 복사되었습니다!');
    } catch (error) {
      console.error('복사 실패:', error);
      alert('URL 복사에 실패했습니다.');
    }
  };

  // 새 탭에서 열기
  const handleOpenUrl = () => {
    window.open(qrUrl, '_blank');
  };

  return (
    <div className={styles.container}>
      <div className={styles.qrWrapper} ref={qrRef}>
        <QRCodeSVG
          value={qrUrl}
          size={size}
          level="H"
          includeMargin={true}
        />
      </div>

      <div className={styles.info}>
        <p className={styles.productName}>{productName}</p>
        <div className={styles.urlWrapper}>
          <code className={styles.url}>{qrUrl}</code>
          <button 
            className={styles.copyButton}
            onClick={handleCopyUrl}
            title="URL 복사"
          >
            <Copy size={16} />
          </button>
        </div>
      </div>

      <div className={styles.actions}>
        <Button
          variant="primary"
          size="md"
          onClick={handleDownload}
        >
          <Download size={18} />
          다운로드
        </Button>

        <Button
          variant="outline"
          size="md"
          onClick={handlePrint}
        >
          <Printer size={18} />
          인쇄
        </Button>

        <Button
          variant="outline"
          size="md"
          onClick={handleOpenUrl}
        >
          <ExternalLink size={18} />
          열기
        </Button>
      </div>
    </div>
  );
}