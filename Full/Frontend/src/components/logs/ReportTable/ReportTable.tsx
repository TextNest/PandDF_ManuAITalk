// ============================================
// 📄 4. src/components/logs/ReportTable/ReportTable.tsx
// ============================================
// 세션 리포트 조회 컴포넌트
// ============================================

'use client';

import React, { useEffect, useState } from "react";
import { formatProductId } from "@/lib/utils/log.utils";
import styles from "./ReportTable.module.css";
import type { SessionReport } from "@/types/log.types.ts";
import apiClient from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

type ReportTableProps = {
  open: boolean;
  sid: number | null;   // session_internal_id (조회용 키)
  onClose: () => void;
  onOpenLog?: () => void;      // 상세 로그 모달 열기용 (옵션)
};

// 리포트 조회 API 호출
async function fetchSessionReport(sid: number): Promise<SessionReport> {
  const res = await apiClient.get<SessionReport>(
    API_ENDPOINTS.LOGS.VIEW_REPORT(sid)
  );
  return res.data;
}

export default function ReportTable({
  open,
  sid,
  onClose,
  onOpenLog,
}: ReportTableProps) {
  const [report, setReport] = useState<SessionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ESC로 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // 모달 열릴 때마다 리포트 조회
  useEffect(() => {
    if (!open || sid == null) {
      return;
    }
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSessionReport(sid);
        if (!cancelled) {
          setReport(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message ?? "리포트 조회 중 오류가 발생했어요.");
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

  const isResolved = report?.status === 1;

  const productLabel =
    report != null
      ? `${report.productName ?? "Unknown"} (${formatProductId(
          report.productId
        )})`
      : "";

  return (
    <div className={styles.backdrop} onClick={onClose}>
      {/* 모달 내부 클릭 시 닫힘 방지 */}
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.reportCard}>
          <header className={styles.header}>
            <div>
              <h2 className={styles.title}>세션 리포트</h2>
              {report && (
                <p className={styles.subtitle}>세션 ID: {report.sessionId}</p>
              )}
            </div>
            <button className={styles.closeButton} onClick={onClose}>
              ✕
            </button>
          </header>

          <div className={styles.content}>
            {loading && <p>리포트를 불러오는 중이에요…</p>}
            {error && <p>{error}</p>}

            {report && !loading && !error && (
              <>
                {/* 기본 정보 */}
                <section className={styles.section}>
                  <h3>기본 정보</h3>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>제품</span>
                      <span className={styles.infoValue}>{productLabel}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>카테고리</span>
                      <span className={styles.infoValue}>
                        {report.category ?? "Unknown"}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>시작 시각</span>
                      <span className={styles.infoValue}>{report.startedAt}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>종료 시각</span>
                      <span className={styles.infoValue}>{report.endedAt}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>상태</span>
                      <span
                        className={`${styles.infoValue} ${
                          isResolved ? styles.resolved : styles.unresolved
                        }`}
                      >
                        {isResolved ? "해결됨" : "미해결"}
                      </span>
                    </div>
                  </div>
                </section>

                {/* 상담 결과 (통계) */}
                <section className={styles.section}>
                  <h3>상담 결과</h3>
                  <div className={styles.statGrid}>
                    <div className={styles.statCard}>
                      <div className={styles.statLabel}>만족도</div>
                      <div className={styles.statValue}>
                        {report.satisfaction.toFixed(1)}
                        <span className={styles.statUnit}>%</span>
                      </div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statLabel}>긍정 피드백</div>
                      <div className={styles.statValue}>{report.positive}</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statLabel}>부정 피드백</div>
                      <div className={styles.statValue}>{report.negative}</div>
                    </div>
                  </div>
                </section>

                {/* 요약 */}
                <section className={styles.section}>
                  <h3>요약</h3>
                  <p className={styles.summaryText}>{report.summary}</p>
                </section>

                {/* (선택) 상세 로그 보기 버튼 */}
                {onOpenLog && (
                  <div className={styles.footer}>
                    <button
                      type="button"
                      className={styles.logButton}
                      onClick={onOpenLog}
                    >
                      상세 로그 보기
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
