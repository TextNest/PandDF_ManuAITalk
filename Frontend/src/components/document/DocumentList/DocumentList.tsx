// ============================================
// 📄 4. src/components/document/DocumentList/DocumentList.tsx
// ============================================
// 문서 목록 컴포넌트
// ============================================

import DocumentCard from '../DocumentCard/DocumentCard';
import { Document } from '@/types/document.types';
import styles from './DocumentList.module.css';

interface DocumentListProps {
  documents: Document[];
}

export default function DocumentList({ documents }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className={styles.empty}>
        <p>문서가 없습니다</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {documents.map((doc) => (
        <DocumentCard key={doc.id} document={doc} />
      ))}
    </div>
  );
}
