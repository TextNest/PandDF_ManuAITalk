// ============================================
// 📄 src/features/documents/hooks/useDocuments.ts
// ============================================
// 문서 목록 데이터 페칭 훅
// ============================================

import { useState, useEffect } from 'react';

// 타입 정의
export interface Document {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  uploadDate: string;
  productName: string;
  productId: string;
  status: 'processing' | 'ready' | 'error';
  pageCount?: number;
  version?: string;
}

export interface DocumentsData {
  documents: Document[];
  total: number;
}

interface UseDocumentsOptions {
  searchQuery?: string;
  filter?: 'all' | 'ready' | 'processing' | 'error';
  sortBy?: 'date' | 'name' | 'size';
}

export function useDocuments(options: UseDocumentsOptions = {}) {
  const [data, setData] = useState<DocumentsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 실제로는 API 호출
    // const response = await apiClient.get('/api/documents', { params: options });
    
    // Mock 데이터 페칭 시뮬레이션 (1초 딜레이)
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock 데이터
        const mockDocuments: Document[] = [
          {
            id: '1',
            title: 'Galaxy S24 Ultra 사용 설명서',
            fileName: 'galaxy-s24-ultra-manual.pdf',
            fileSize: 15728640, // 15MB
            uploadDate: '2024-10-15T10:30:00',
            productName: 'Galaxy S24 Ultra',
            productId: 'prod-001',
            status: 'ready',
            pageCount: 156,
            version: '1.0',
          },
          {
            id: '2',
            title: 'AirPods Pro 2 Quick Start Guide',
            fileName: 'airpods-pro-2-guide.pdf',
            fileSize: 5242880, // 5MB
            uploadDate: '2024-10-14T15:20:00',
            productName: 'AirPods Pro 2',
            productId: 'prod-002',
            status: 'ready',
            pageCount: 24,
            version: '2.1',
          },
          {
            id: '3',
            title: 'MacBook Pro M3 사용자 가이드',
            fileName: 'macbook-pro-m3-manual.pdf',
            fileSize: 20971520, // 20MB
            uploadDate: '2024-10-13T09:15:00',
            productName: 'MacBook Pro M3',
            productId: 'prod-003',
            status: 'processing',
            pageCount: 0,
          },
          {
            id: '4',
            title: 'iPhone 15 Pro Max 설명서',
            fileName: 'iphone-15-pro-max.pdf',
            fileSize: 12582912, // 12MB
            uploadDate: '2024-10-12T14:45:00',
            productName: 'iPhone 15 Pro Max',
            productId: 'prod-004',
            status: 'ready',
            pageCount: 98,
            version: '1.2',
          },
          {
            id: '5',
            title: 'Apple Watch Series 9 매뉴얼',
            fileName: 'apple-watch-s9.pdf',
            fileSize: 8388608, // 8MB
            uploadDate: '2024-10-11T11:00:00',
            productName: 'Apple Watch Series 9',
            productId: 'prod-005',
            status: 'ready',
            pageCount: 45,
            version: '1.0',
          },
          {
            id: '6',
            title: 'iPad Pro 13" 사용 가이드',
            fileName: 'ipad-pro-13-guide.pdf',
            fileSize: 18874368, // 18MB
            uploadDate: '2024-10-10T16:30:00',
            productName: 'iPad Pro 13"',
            productId: 'prod-006',
            status: 'error',
            pageCount: 0,
          },
        ];

        // 필터 적용
        let filteredDocs = mockDocuments;
        
        if (options.filter && options.filter !== 'all') {
          filteredDocs = filteredDocs.filter(doc => doc.status === options.filter);
        }
        
        if (options.searchQuery) {
          const query = options.searchQuery.toLowerCase();
          filteredDocs = filteredDocs.filter(doc => 
            doc.title.toLowerCase().includes(query) ||
            doc.productName.toLowerCase().includes(query)
          );
        }

        setData({
          documents: filteredDocs,
          total: filteredDocs.length,
        });
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [options.searchQuery, options.filter, options.sortBy]);

  return {
    data,
    isLoading,
    error,
    refetch: () => {
      setIsLoading(true);
      // 리페치 로직
    },
  };
}