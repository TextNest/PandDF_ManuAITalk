// ============================================
// 📄 1. src/app/(admin)/faq/auto-generate/page.tsx
// ============================================
// FAQ 자동 생성 페이지
// ============================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Calendar, TrendingUp } from 'lucide-react';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import FAQAutoGenerate from '@/components/faq/FAQAutoGenerate/FAQAutoGenerate';
import { FAQAutoGenerateResult } from '@/types/faq.types';
import styles from './auto-generate-page.module.css';

// 임시 생성 결과 데이터
const mockResults: FAQAutoGenerateResult[] = [
  {
    question: '세탁기 문이 안 열려요',
    suggestedAnswer: '세탁이 완료된 후 약 2-3분 후에 도어 잠금이 자동으로 해제됩니다. 만약 해제되지 않는다면 전원을 껐다가 다시 켜보세요.',
    occurrence: 45,
    confidence: 0.92,
  },
  {
    question: '세탁 중 소음이 심해요',
    suggestedAnswer: '세탁물이 한쪽으로 쏠려 있을 수 있습니다. 세탁물을 고르게 분산시켜 주세요. 또한 제품이 평평한 바닥에 설치되어 있는지 확인하세요.',
    occurrence: 38,
    confidence: 0.88,
  },
  {
    question: '물이 배수되지 않아요',
    suggestedAnswer: '배수 필터가 막혀있을 수 있습니다. 제품 하단의 배수 필터를 청소해 주세요. 또한 배수 호스가 구부러지지 않았는지 확인하세요.',
    occurrence: 32,
    confidence: 0.85,
  },
];

export default function FAQAutoGeneratePage() {
  const router = useRouter();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<FAQAutoGenerateResult[]>([]);

  const handleGenerate = () => {
    if (!startDate || !endDate) {
      alert('날짜를 선택해주세요.');
      return;
    }

    setIsGenerating(true);

    // TODO: 실제 API 연동
    setTimeout(() => {
      setResults(mockResults);
      setIsGenerating(false);
    }, 2000);
  };

  const handleSave = () => {
    alert('FAQ가 저장되었습니다!');
    router.push('/faq');
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>
            <Sparkles size={28} />
            FAQ 자동 생성
          </h1>
          <p className={styles.subtitle}>
            대화 로그를 분석하여 자주 묻는 질문을 자동으로 생성합니다
          </p>
        </div>
      </div>

      <div className={styles.content}>
        {/* 설정 섹션 */}
        <div className={styles.settingsCard}>
          <h3 className={styles.cardTitle}>
            <Calendar size={20} />
            분석 기간 설정
          </h3>
          
          <div className={styles.dateInputs}>
            <Input
              type="date"
              label="시작일"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              fullWidth
            />
            <Input
              type="date"
              label="종료일"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              fullWidth
            />
          </div>

          <div className={styles.infoBox}>
            <TrendingUp size={20} />
            <div>
              <h4>분석 방법</h4>
              <p>선택한 기간 동안의 사용자 질문을 AI가 분석하여 빈도가 높고 패턴이 유사한 질문들을 자동으로 그룹화합니다.</p>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={isGenerating}
            onClick={handleGenerate}
          >
            <Sparkles size={20} />
            FAQ 생성하기
          </Button>
        </div>

        {/* 결과 섹션 */}
        {results.length > 0 && (
          <div className={styles.resultsSection}>
            <div className={styles.resultsHeader}>
              <h3 className={styles.cardTitle}>
                생성된 FAQ ({results.length}개)
              </h3>
              <Button variant="primary" onClick={handleSave}>
                전체 저장
              </Button>
            </div>

            <FAQAutoGenerate results={results} />
          </div>
        )}
      </div>
    </div>
  );
}