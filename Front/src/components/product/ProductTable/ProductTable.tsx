// 📄 1. src/components/product/ProductTable/ProductTable.tsx
// ============================================
// 제품 테이블 뷰
// ============================================

import { QrCode, FileText, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Product } from '@/types/product.types';
import { formatRelativeTime } from '@/lib/utils/format';
import styles from './ProductTable.module.css';

interface ProductTableProps {
  products: Product[];
}

export default function ProductTable({ products }: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className={styles.empty}>
        <p>제품이 없습니다</p>
      </div>
    );
  }

  const handleDownloadQR = (productModel: string) => {
    alert(`QR 코드 다운로드: ${productModel}`);
  };

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>제품명</th>
            <th>모델</th>
            <th>카테고리</th>
            <th>문서</th>
            <th>상태</th>
            <th>업데이트</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td className={styles.nameCell}>
                <div className={styles.productName}>{product.name}</div>
              </td>
              <td>
                <span className={styles.model}>{product.model}</span>
              </td>
              <td>{product.category}</td>
              <td>
                {product.documentName ? (
                  <div className={styles.document}>
                    <FileText size={16} />
                    <span>{product.documentName}</span>
                  </div>
                ) : (
                  <span className={styles.noDocument}>-</span>
                )}
              </td>
              <td>
                <span className={`${styles.status} ${styles[product.status]}`}>
                  {product.status === 'active' ? '활성' : '비활성'}
                </span>
              </td>
              <td className={styles.dateCell}>
                {formatRelativeTime(product.updatedAt)}
              </td>
              <td>
                <div className={styles.actions}>
                  {product.qrCodeUrl && (
                    <button
                      className={styles.actionButton}
                      onClick={() => handleDownloadQR(product.model)}
                      title="QR 코드"
                    >
                      <QrCode size={18} />
                    </button>
                  )}
                  <Link
                    href={`/products/${product.id}`}
                    className={styles.actionButton}
                    title="수정"
                  >
                    <Edit size={18} />
                  </Link>
                  <button
                    className={`${styles.actionButton} ${styles.danger}`}
                    title="삭제"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
