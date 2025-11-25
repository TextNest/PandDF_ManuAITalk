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
            <tr key={product.internal_id}>
              <td className={styles.nameCell}>
                <div className={styles.productName}>{product.product_name}</div>
              </td>
              <td>
                <span className={styles.model}>{product.product_id}</span>
              </td>
              <td>{product.category}</td>
              <td>
                {product.pdf_path ? (
                  <div className={styles.document}>
                    <FileText size={16} />
                    <span>PDF 문서</span> {/* Display a generic name for the document */}
                  </div>
                ) : (
                  <span className={styles.noDocument}>-</span>
                )}
              </td>
              <td>
                <span className={`${styles.status} ${product.is_active ? styles.active : styles.inactive}`}>
                  {product.is_active ? '활성' : '비활성'}
                </span>
              </td>
              <td className={styles.dateCell}>
                {formatRelativeTime(new Date(product.updated_at))}
              </td>
              <td>
                <div className={styles.actions}>
                  {/* QR 코드 버튼은 product.product_id가 있을 때만 표시 */}
                  {product.product_id && (
                    <button
                      className={styles.actionButton}
                      onClick={() => handleDownloadQR(product.product_id as string)}
                      title="QR 코드"
                    >
                      <QrCode size={18} />
                    </button>
                  )}
                  <Link
                    href={`/products/edit/${product.product_id}`}
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
