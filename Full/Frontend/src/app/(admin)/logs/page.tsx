// ============================================
// 📄 src/app/(admin)/logs/page.tsx
// ============================================
// 로그 분석 페이지 (개선판 ver.1.0)
// ============================================

'use client';

import { useState, useEffect } from 'react';
import {  
  BarChart3, 
  Clock, 
  History, 
  ThumbsUp
} from 'lucide-react';
import Button from '@/components/ui/Button/Button';
import ResponseTimeChart from '@/components/dashboard/ResponseTimeChart/ResponseTimeChart';
import RecentSessionTable from '@/components/logs/RecentSessionTable/RecentSessionTable';
import SessionFilterTable from '@/components/logs/SessionFilter/SessionFilter';
import SessionTable from '@/components/logs/SessionTable/SessionTable';
import ReportTable from '@/components/logs/ReportTable/ReportTable';
import LogTable from '@/components/logs/LogTable/LogTable';
import {
  SessionFilter,
  SessionRecent,
  SessionList,
  SessionReport,
  SessionLog,
  SessionListResponse
} from '@/types/log.types';
import apiClient from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import styles from './logs-page.module.css';

export default function LogsPage() {
  const [dateRange, setDateRange] = useState('7days');
  const [recentSessions, setRecentSessions] = useState<SessionRecent[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [filter, setFilter] = useState<SessionFilter>({status: 'all'});
  const [productOptions, setProductOptions] = useState<{productId: string}[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [sessions, setSessions] = useState<SessionList[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalSessions / pageSize));

  const handleFilterChange = (next: SessionFilter) => {
    setFilter(next);
    setPage(1);
  };

  useEffect(() => {
    const fetchRecentSessions = async () => {
      try {
        setRecentLoading(true);
        const res = await apiClient.get<SessionRecent[]>(
          API_ENDPOINTS.LOGS.RECENT
        );

        setRecentSessions(res.data);
      } catch (error) {
        console.error('최근 문의 불러오기 실패:', error);
      } finally {
        setRecentLoading(false);
      }
    };
    fetchRecentSessions();
  }, []);

  useEffect(() => {
    const fetchProductOptions = async () => {
      try {
        const res = await apiClient.get<{ productId: string }[]>(
          API_ENDPOINTS.LOGS.INFO
        );
        setProductOptions(res.data);
      } catch (error) {
        console.error('제품 목록 불러오기 실패:', error);
      }
    };
    fetchProductOptions();
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setSessionsLoading(true);
        const params: Record<string, string> = {};
        if (filter.sessionId?.trim()) params.sessionId = filter.sessionId.trim();
        if (filter.productId) params.productId = filter.productId;
        if (filter.status && filter.status !== 'all') params.status = filter.status;
        if (filter.from) params.from = filter.from;
        if (filter.to) params.to = filter.to;
        params.limit = String(pageSize);
        params.offset = String((page - 1) * pageSize);

        const res = await apiClient.get<SessionListResponse>(
          API_ENDPOINTS.LOGS.LIST,
          { params }
        );

        setSessions(res.data.items);
        setTotalSessions(res.data.total);
      } catch (error) {
        console.error('세션 목록 불러오기 실패:', error);
      } finally {
        setSessionsLoading(false);
      }
    };
    fetchSessions();
  }, [filter, dateRange, page]);

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

      {/* 최근 문의 섹션 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <History size={24} />
          최근 문의
        </h2>

        {recentLoading ? (
          <div className={styles.emptyState}>
            최근 문의를 불러오는 중이에요…
          </div>
        ) : (
          <RecentSessionTable
            sessions={recentSessions}
            onSelectSession={(sid) => {
              console.log('최근 문의 클릭:', sid);
              // TODO: 여기서 바로 리포트 조회 or 세션 목록으로 스크롤/이동 등 붙이면 돼요
            }}
          />
        )}
      </div>

      {/* 필터 & 검색 */}
      <SessionFilterTable
        filter={filter}
        onChangeFilter={handleFilterChange}
        products={productOptions}
      />

      {/* 세션 목록 */}
      {sessionsLoading ? (
        <div className={styles.emptyState}>
          세션 목록을 불러오는 중이에요…
        </div>
      ) : sessions.length === 0 ? (
        <div className={styles.emptyState}>
          조건에 해당하는 세션이 없어요.
        </div>
      ) : (
        <SessionTable
          sessions={sessions}
          onSelectSession={(sid) => {
            console.log('세션 선택:', sid);
            // 나중에 상세 페이지로 이동하거나 오른쪽 패널에 로그 펼치는 용도로 쓸 수 있어요.
          }}
        />
      )}

      <div className={styles.pagination}>
        {/* 이전 버튼 */}
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className={styles.pageNavButton}
        >
          이전
        </button>

        {/* 번호 버튼 */}
        {Array.from({ length: totalPages }, (_, idx) => {
          const p = idx + 1;
          const isActive = p === page;

          return (
            <span
              key={p}
              onClick={() => setPage(p)}
              className={
                isActive ? styles.pageNumberActive : styles.pageNumber
              }
            >
              {p}
            </span>
          );
        })}

        {/* 다음 버튼 */}
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className={styles.pageNavButton}
        >
          다음
        </button>
      </div>

      {/* 응답 시간 차트 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>⏱️ 응답 시간 추이</h2>
        <ResponseTimeChart />
      </div>
    </div>
  );
}