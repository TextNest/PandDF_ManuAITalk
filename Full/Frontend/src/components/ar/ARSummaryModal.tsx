// Full/Frontend/src/components/ar/ARSummaryModal.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { X, MessageSquare } from 'lucide-react';
import styles from './ARSummaryModal.module.css';
import { FurnitureItem } from '@/lib/ar/types';

interface ARSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: FurnitureItem[];
}

const ARSummaryModal: React.FC<ARSummaryModalProps> = ({ isOpen, onClose, items }) => {
  const router = useRouter();

  if (!isOpen) {
    return null;
  }

  const handleGoToChat = (itemId: string) => {
    onClose();
    router.push(`/chat/${itemId}`);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>AR 세션 요약</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        </div>
        <div className={styles.content}>
          <p>공간에 배치했던 제품들입니다. 제품을 선택하여 AI 챗봇에게 더 자세한 정보를 물어보세요.</p>
          {items.length > 0 ? (
            <ul className={styles.itemList}>
              {items.map((item) => (
                <li key={item.id} className={styles.item}>
                  <span className={styles.itemName}>{item.name}</span>
                  <button 
                    onClick={() => handleGoToChat(item.id)}
                    className={styles.chatButton}
                  >
                    <MessageSquare size={16} />
                    <span>챗봇</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyMessage}>배치된 제품이 없습니다.</p>
          )}
        </div>
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.footerCloseButton}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ARSummaryModal;
