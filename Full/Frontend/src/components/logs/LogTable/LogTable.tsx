// ============================================
// 📄 5. src/components/logs/LogTable/LogTable.tsx
// ============================================
// 상세 로그 조회 컴포넌트
// ============================================

'use client';

import React, { useEffect, useState } from "react";
import styles from "./LogTable.module.css";
import type { SessionLog } from "@/types/log.types.ts";
import apiClient from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type LogTableProps = {
  open: boolean;
  sid: number | null;      // session_internal_id
  onClose: () => void;
};

// 상세 로그 조회 API 호출
async function fetchLogDetail(sid: number): Promise<SessionLog[]> {
  const res = await apiClient.get<SessionLog[]>(
    API_ENDPOINTS.LOGS.VIEW_LOG(sid)
  );
  return res.data;
}

export default function LogTable({ open, sid, onClose }: LogTableProps) {
  const [logs, setLogs] = useState<SessionLog[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ESC 로 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // 모달 열릴 때마다 로그 조회
  useEffect(() => {
    if (!open || sid == null) {
      return;
    }
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchLogDetail(sid);
        if (!cancelled) {
          setLogs(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message ?? "상세 로그 조회 중 오류가 발생했어요.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [open, sid]);

  if (!open || sid == null) {
    return null;
  }

  const hasNoLogs = !loading && !error && (logs == null || logs.length === 0);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      {/* 모달 내부 클릭 시 닫힘 방지 */}
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.logCard}>
          <header className={styles.header}>
            <div>
              <h2 className={styles.title}>상세 로그</h2>
              {sid != null && (
                <p className={styles.subtitle}>세션 ID: {sid}</p>
              )}
            </div>
            <button className={styles.closeButton} onClick={onClose}>
              ✕
            </button>
          </header>

          <div className={styles.content}>
            {loading && <p>로그를 불러오는 중이에요…</p>}
            {error && <p className={styles.error}>{error}</p>}

            {hasNoLogs && (
              <p className={styles.empty}>
                이 세션에는 저장된 로그가 없어요.
              </p>
            )}

            {logs && !loading && !error && logs.length > 0 && (
              <div className={styles.logList}>
                {logs.map((turn) => (
                  <article
                    key={turn.createdAt}
                    className={styles.logItem}
                  >
                    <div className={styles.metaRow}>
                      <span className={styles.timestamp}>
                        {turn.createdAt}
                      </span>
                      {turn.feedback && (
                        <span className={styles.feedback}>
                          피드백: {turn.feedback}
                        </span>
                      )}
                    </div>

                    <div className={styles.messageBlock}>
                      <div className={styles.messageLabel}>USER</div>
                      <div className={styles.messageBody}>
                        {turn.userMessage || "(메시지 없음)"}
                      </div>
                    </div>

                    <div className={styles.messageBlock}>
                      <div className={styles.messageLabel}>BOT</div>
                      <div className={styles.messageBody}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {turn.botMessage || "(메시지 없음)"}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
