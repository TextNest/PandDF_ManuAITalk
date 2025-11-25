// ============================================
// 📄 3. src/components/faq/FAQAutoGenerate/FAQAutoGenerate.tsx
// ============================================
// FAQ 자동 생성 결과 컴포넌트
// ============================================

'use client';

import { useState } from 'react';
import { Check, X, Edit, TrendingUp } from 'lucide-react';
import { FAQAutoGenerateResult } from '@/types/faq.types';
import styles from './FAQAutoGenerate.module.css';

interface FAQAutoGenerateProps {
  results: FAQAutoGenerateResult[];
}

export default function FAQAutoGenerate({ results }: FAQAutoGenerateProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedAnswer, setEditedAnswer] = useState('');

  const handleToggleSelect = (index: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelected(newSelected);
  };

  const handleStartEdit = (index: number, answer: string) => {
    setEditingIndex(index);
    setEditedAnswer(answer);
  };

  const handleSaveEdit = () => {
    // TODO: 답변 수정 저장
    setEditingIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditedAnswer('');
  };

  return (
    <div className={styles.container}>
      {results.map((result, index) => (
        <div key={index} className={styles.resultCard}>
          <div className={styles.header}>
            <input
              type="checkbox"
              checked={selected.has(index)}
              onChange={() => handleToggleSelect(index)}
              className={styles.checkbox}
            />
            
            <div className={styles.headerContent}>
              <h4 className={styles.question}>{result.question}</h4>
              <div className={styles.meta}>
                <span className={styles.occurrence}>
                  <TrendingUp size={14} />
                  {result.occurrence}회 질문됨
                </span>
                <span className={styles.confidence}>
                  신뢰도 {Math.round(result.confidence * 100)}%
                </span>
              </div>
            </div>

            <div className={styles.confidenceBadge}>
              <div 
                className={styles.confidenceBar}
                style={{ 
                  width: `${result.confidence * 100}%`,
                  backgroundColor: result.confidence > 0.9 ? 'var(--color-success)' : 
                                   result.confidence > 0.8 ? 'var(--color-warning)' : 
                                   'var(--color-error)'
                }}
              />
            </div>
          </div>

          <div className={styles.body}>
            {editingIndex === index ? (
              <div className={styles.editMode}>
                <textarea
                  value={editedAnswer}
                  onChange={(e) => setEditedAnswer(e.target.value)}
                  className={styles.textarea}
                  rows={4}
                />
                <div className={styles.editActions}>
                  <button 
                    className={styles.saveButton}
                    onClick={handleSaveEdit}
                  >
                    <Check size={16} />
                    저장
                  </button>
                  <button 
                    className={styles.cancelButton}
                    onClick={handleCancelEdit}
                  >
                    <X size={16} />
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className={styles.answer}>{result.suggestedAnswer}</p>
                <button 
                  className={styles.editButton}
                  onClick={() => handleStartEdit(index, result.suggestedAnswer)}
                >
                  <Edit size={16} />
                  수정
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}