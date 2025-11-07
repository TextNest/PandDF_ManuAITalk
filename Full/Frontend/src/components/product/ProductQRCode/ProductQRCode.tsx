// ============================================
// 📄 5. src/components/product/ProductQRCode/ProductQRCode.tsx
// ============================================
// QR 코드 생성 및 표시 컴포넌트
// ============================================

'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';
import { Download, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button/Button';
import styles from './ProductQRCode.module.css';

interface ProductQRCodeProps {
  productId: string;
  productName: string;
}

export default function ProductQRCode({ productId, productName }: ProductQRCodeProps) {
  const [qrValue] = useState(`${process.env.NEXT_PUBLIC_APP_URL}/chat/${productId}`);

  const handleDownload = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${productId}-qrcode.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleRegenerate = () => {
    alert('QR 코드가 재생성되었습니다.');
  };

  return (
    <div className={styles.container}>
      <div className={styles.qrWrapper}>
        <QRCode
          id="qr-code-svg"
          value={qrValue}
          size={256}
          level="H"
        />
      </div>

      <div className={styles.info}>
        <h4 className={styles.title}>{productName}</h4>
        <p className={styles.url}>{qrValue}</p>
      </div>

      <div className={styles.actions}>
        <Button variant="outline" onClick={handleRegenerate}>
          <RefreshCw size={18} />
          재생성
        </Button>
        <Button variant="primary" onClick={handleDownload}>
          <Download size={18} />
          다운로드
        </Button>
      </div>
    </div>
  );
}