// ============================================
// 📄 src/app/(admin)/logs/page.tsx
// ============================================
// 로그 분석 페이지 (완전판)
// ============================================

'use client';

import { useState } from 'react';
import { 
  AlertCircle, 
  BarChart3, 
  Clock, 
  History, 
  ThumbsUp
} from 'lucide-react';
import Button from '@/components/ui/Button/Button';
import ResponseTimeChart from '@/components/dashboard/ResponseTimeChart/ResponseTimeChart';
import TopQuestionsTable from '@/components/logs/TopQuestionsTable/TopQuestionsTable';
import UnansweredQueries from '@/components/logs/UnansweredQueries/UnansweredQueries';
import { TopQuestion, UnansweredQuery } from '@/types/log.types';

import RecentSessionTable from '@/components/logs/RecentSessionTable/RecentSessionTable';
import SessionFilterTable from '@/components/logs/SessionFilter/SessionFilter';
import SessionTable from '@/components/logs/SessionTable/SessionTable';
import {} from '@/components/logs/ReportTable/ReportTable';
import {} from '@/components/logs/LogTable/LogTable';
import { SessionFilter, SessionRecent, SessionList, SessionReport, SessionLog } from '@/types/log.types';
import { formatProductId, statusColor } from '@/lib/utils/log.utils';
import styles from './logs-page.module.css';

// ============================================
// 📄 Mock 데이터 (TODO: 백엔드 연동)
// ============================================
const mockTopQuestions: TopQuestion[] = [
  { question: '제품 사용법이 궁금해요', count: 234, averageResponseTime: 2.3, helpfulRate: 0.89 },
  { question: '고장이 났어요', count: 187, averageResponseTime: 3.1, helpfulRate: 0.82 },
  { question: 'A/S는 어떻게 받나요?', count: 156, averageResponseTime: 1.8, helpfulRate: 0.95 },
  { question: '설치 방법을 알려주세요', count: 143, averageResponseTime: 2.5, helpfulRate: 0.87 },
  { question: '제품 보증 기간은?', count: 128, averageResponseTime: 1.5, helpfulRate: 0.92 },
];

const mockRecentSessions: SessionRecent[] = [
  {
    sessionId: '111111',
    productId: 'SAH001',
    firstMessage: '작동이 안 되는데 어떻게 해야 하나요?',
    status: 'resolved',
    satisfaction: 75.00,
  },
  {
    sessionId: '222222',
    productId: null,
    firstMessage: '소음이 너무 커요.',
    status: 'unresolved',
    satisfaction: 50.00,
  },
  {
    sessionId: '333333',
    productId: 'SAF201',
    firstMessage: '전원이 꺼졌다 켜져요.',
    status: 'resolved',
    satisfaction: 87.25,
  },
];

const mockSessions: SessionList[] = [
  {
    sessionId: '111111',
    productId: 'SAH001',
    firstMessage: '작동이 안 되는데 어떻게 해야 하나요?',
    status: 'resolved',
    endedAt: '2025-11-17 10:52:15',
    satisfaction: 75.00,
  },
  {
    sessionId: '222222',
    productId: null,
    firstMessage: '소음이 너무 커요.',
    status: 'unresolved',
    endedAt: '2025-11-18 17:37:02',
    satisfaction: 50.00,
  },
  {
    sessionId: '333333',
    productId: 'SAF201',
    firstMessage: '전원이 꺼졌다 켜져요.',
    status: 'resolved',
    endedAt: '2025-11-19 12:48:54',
    satisfaction: 87.25,
  },
];

const mockUnanswered: UnansweredQuery[] = [
  {
    id: '1',
    question: '이 제품은 해외에서도 사용 가능한가요?',
    productId: 'WM-2024',
    productName: '세탁기 WM-2024',
    timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000), // 26시간 전 (긴급)
    attemptCount: 3,
  },
  {
    id: '2',
    question: '소음이 70dB 이상 나는데 정상인가요?',
    productId: 'WM-2024',
    productName: '세탁기 WM-2024',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8시간 전 (주의)
    attemptCount: 2,
  },
  {
    id: '3',
    question: '필터 청소는 어떻게 하나요?',
    productId: 'AC-2024',
    productName: '에어컨 AC-2024',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2시간 전 (최근)
    attemptCount: 1,
  },
];

const monkProductOptions = [
  {
    value: 'WM-2024',
    label: '세탁기 WM-2024'
  },
  {
    value:'AC-2024',
    label:'에어컨 AC-2024'
  },
  {
    value:'RF-2024',
    label:'냉장고 RF-2024'
  }
]

export default function LogsPage() {
  const [dateRange, setDateRange] = useState('7days');
  const unansweredCount = mockUnanswered.length;
  const urgentCount = mockUnanswered.filter(
    q => (Date.now() - q.timestamp.getTime()) / (1000 * 60 * 60) > 24
  ).length;

  const [filter, setFilter] = useState<SessionFilter>({
    status: 'all'
  });

  return (
    <div className={styles.page}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div>
          <h1>로그 분석</h1>
          <p className={styles.subtitle}>대화 로그와 사용자 질문을 분석합니다</p>
        </div>
        
        <select 
          className={styles.dateSelect}
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
        >
          <option value="24hours">최근 24시간</option>
          <option value="7days">최근 7일</option>
          <option value="30days">최근 30일</option>
          <option value="90days">최근 90일</option>
        </select>
      </div>

      {/* 🚨 긴급 알림 배너 */}
      {unansweredCount > 0 && (
        <div className={styles.urgentBanner}>
          <div className={styles.bannerIcon}>
            <AlertCircle size={24} />
          </div>
          <div className={styles.bannerContent}>
            <h3 className={styles.bannerTitle}>
              미답변 질문 {unansweredCount}건
              {urgentCount > 0 && (
                <span className={styles.urgentBadge}>
                  긴급 {urgentCount}건
                </span>
              )}
            </h3>
            <p className={styles.bannerText}>
              사용자가 답변을 기다리고 있습니다. 빠른 대응이 필요합니다.
            </p>
          </div>
          <Button variant="primary" onClick={() => {
            document.getElementById('unanswered-section')?.scrollIntoView({ 
              behavior: 'smooth' 
            });
          }}>
            지금 확인
          </Button>
        </div>
      )}

      {/* 최근 문의 섹션 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <History size={24}/>
          최근 문의
        </h2>
        <RecentSessionTable
          sessions={mockRecentSessions}
          onSelectSession={(sid) => console.log("최근 문의 클릭:", sid)}
        />
      </div>

      {/* 필터 & 검색 */}
      <SessionFilterTable
        filter={filter}
        onChangeFilter={setFilter}
        products={monkProductOptions}
      />

      {/* 세션 목록 */}
      <SessionTable
        sessions={mockSessions}
        onSelectSession={(sid) => console.log("최근 문의 클릭:", sid)}
      />

      {/* 🚨 미답변 질문 (최우선) */}
      <div id="unanswered-section" className={styles.unansweredSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <AlertCircle size={24} className={styles.urgentIcon} />
            미답변 질문
          </h2>
          <span className={styles.badge}>{unansweredCount}</span>
        </div>
        
        {/* 🆕 우선순위 기준 안내 */}
        <div className={styles.priorityGuide}>
          <span className={styles.guideLabel}>우선순위 기준:</span>
          <div className={styles.guideItems}>
            <div className={styles.guideItem}>
              <span className={`${styles.guideDot} ${styles.urgent}`}></span>
              <span>긴급 (24시간 이상)</span>
            </div>
            <div className={styles.guideItem}>
              <span className={`${styles.guideDot} ${styles.warning}`}></span>
              <span>주의 (6-24시간)</span>
            </div>
            <div className={styles.guideItem}>
              <span className={`${styles.guideDot} ${styles.recent}`}></span>
              <span>최근 (6시간 미만)</span>
            </div>
          </div>
        </div>
        
        <UnansweredQueries queries={mockUnanswered} />
      </div>

      {/* 핵심 지표 (간소화) */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ backgroundColor: '#667eea' }}>
            <BarChart3 size={24} />
          </div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>1,547</div>
            <div className={styles.metricLabel}>총 질문 수</div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ backgroundColor: '#10b981' }}>
            <Clock size={24} />
          </div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>2.3s</div>
            <div className={styles.metricLabel}>평균 응답 시간</div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ backgroundColor: '#f59e0b' }}>
            <ThumbsUp size={24} />
          </div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>87.5%</div>
            <div className={styles.metricLabel}>도움이 됨</div>
          </div>
        </div>
      </div>

      {/* 자주 묻는 질문 Top 10 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📈 자주 묻는 질문 Top 10</h2>
        <TopQuestionsTable questions={mockTopQuestions} />
      </div>

      {/* 응답 시간 차트 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>⏱️ 응답 시간 추이</h2>
        <ResponseTimeChart />
      </div>
    </div>
  );
}