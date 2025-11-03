// ============================================
// 📄 2. src/app/(admin)/documents/page.tsx
// ============================================
// 문서 관리 페이지 (고도화)
// ============================================

'use client';

import { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button/Button';
import DocumentList from '@/components/document/DocumentList/DocumentList';
import { Document } from '@/types/document.types';
import styles from './documents-page.module.css';

// 임시 데이터
const mockDocuments: Document[] = [
  {
    id: '1',
    name: '세탁기 사용 설명서',
    fileName: '세탁기_WM-2024.pdf',
    fileSize: 2458624,
    productName: '세탁기 WM-2024',
    productId: 'WM-2024',
    uploadedAt: new Date('2025-01-15'),
    uploadedBy: '관리자',
    status: 'ready',
    pageCount: 45,
    version: 1,
  },
  {
    id: '2',
    name: '냉장고 사용 설명서',
    fileName: '냉장고_RF-2024.pdf',
    fileSize: 3145728,
    productName: '냉장고 RF-2024',
    productId: 'RF-2024',
    uploadedAt: new Date('2025-01-10'),
    uploadedBy: '관리자',
    status: 'ready',
    pageCount: 52,
    version: 2,
  },
  {
    id: '3',
    name: '에어컨 설치 가이드',
    fileName: '에어컨_AC-2024.pdf',
    fileSize: 1048576,
    productName: '에어컨 AC-2024',
    productId: 'AC-2024',
    uploadedAt: new Date('2025-01-05'),
    uploadedBy: '관리자',
    status: 'processing',
    pageCount: 28,
    version: 1,
  },
];

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [documents] = useState<Document[]>(mockDocuments);

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>문서 관리</h1>
          <p className={styles.subtitle}>PDF 문서를 업로드하고 관리하세요</p>
        </div>
        <Link href="/documents/upload">
          <Button variant="primary" size="lg">
            <Plus size={20} />
            문서 업로드
          </Button>
        </Link>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search className={styles.searchIcon} size={20} />
          <input
            type="text"
            placeholder="문서 검색..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <button className={styles.filterButton}>
          <Filter size={20} />
          필터
        </button>
      </div>

      <DocumentList documents={filteredDocuments} />
    </div>
  );
}