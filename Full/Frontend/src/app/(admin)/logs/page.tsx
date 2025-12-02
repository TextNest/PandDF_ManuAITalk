// ============================================
// 📄 src/app/(admin)/logs/page.tsx
// ============================================
// 로그 분석 페이지 (개선판 ver.1.0)
// ============================================

'use client';

import { useState, useEffect } from 'react';
import {  
  History, 
} from 'lucide-react';
import Button from '@/components/ui/Button/Button';
import RecentSessionTable from '@/components/logs/RecentSessionTable/RecentSessionTable';
import SessionFilterTable from '@/components/logs/SessionFilter/SessionFilter';
import SessionTable from '@/components/logs/SessionTable/SessionTable';
import ReportTable from '@/components/logs/ReportTable/ReportTable';
import LogTable from '@/components/logs/LogTable/LogTable';
import {
  ProductInfo,
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
  const [recentSessions, setRecentSessions] = useState<SessionRecent[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [filter, setFilter] = useState<SessionFilter>({status: 'all'});
  const [productOptions, setProductOptions] = useState<ProductInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [sessions, setSessions] = useState<SessionList[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalSessions / pageSize));
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleFilterChange = (next: SessionFilter) => {
    setFilter(next);
    setPage(1);
  };

  const handleSelectSession = (sid: number) => {
    setSelectedSessionId(sid);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedSessionId(null);
  };

  useEffect(() => {
    const fetchRecentSessions = async () => {
      try {
        setRecentLoading(true);
        const res = await apiClient.get<SessionRecent[]>(
          API_ENDPOINTS.LOGS.RECENT
        );
        console.log('최근 문의 결과',res.data);

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
        const res = await apiClient.get<ProductInfo[]>(
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
        if (filter.category) params.category = filter.category;
        if (filter.productId) params.productId = filter.productId;
        if (filter.status !== undefined && filter.status !== 'all') params.status = String(filter.status);
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
  }, [filter, page]);

  return (
    <div className={styles.page}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div>
          <h1>로그 분석</h1>
          <p className={styles.subtitle}>대화 로그와 사용자 질문을 분석합니다</p>
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
              console.log('최근 문의 클릭:', sid,);
              handleSelectSession(sid);
            }}
          />
        )}
      </div>

      {/* 필터 & 검색 */}
      <div className={styles.filterBlock}>
        <SessionFilterTable
          filter={filter}
          onChangeFilter={handleFilterChange}
          products={productOptions}
        />
      </div>

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
            handleSelectSession(sid);
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

        {/* 맨 아래에 모달 추가 */}
        <ReportTable
        open={isDetailOpen}
        sessionId={selectedSessionId}
        onClose={handleCloseDetail}
        />
      </div>
    </div>
  );
}