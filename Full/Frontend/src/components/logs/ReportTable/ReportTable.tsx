// ============================================
// 📄 4. src/components/logs/ReportTable/ReportTable.tsx
// ============================================
// 세션 리포트 조회 컴포넌트
// ============================================

'use client';

import React, { useEffect } from "react";
import styles from "./ReportTable.module.css";

type ReportTableProps = {
  open: boolean;
  sessionId: number | null;      // 또는 string이면 string으로
  onClose: () => void;
  // 나중에 상세 데이터까지 넘기고 싶다면 props 추가 가능
};

export default function ReportTable({
  open,
  sessionId,
  onClose,
}: ReportTableProps) {
  // 모달 열려 있을 때 ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !sessionId) return null;

  // TODO: 여기서 sessionId로 상세 로그 API 호출해서 내용 채우면 됨
  // 지금은 레이아웃만 보여주는 더미 상태로 작성
  return (
    <div className={styles.backdrop} onClick={onClose}>
      {/* 이벤트 버블링 막아서 내부 클릭은 닫히지 않게 */}
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>세션 상세 정보</h2>
            <p className={styles.subtitle}>세션 ID: {sessionId}</p>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </header>

        <div className={styles.content}>
          {/* 여기에 실제 상세 로그 / 메타 정보 컴포넌트 넣으면 됨 */}
          <section className={styles.section}>
            <h3>대화 요약</h3>
            <p>여기에 요약 내용이 들어갈 예정이에요.</p>
          </section>

          <section className={styles.section}>
            <h3>전체 대화 로그</h3>
            <div className={styles.logBox}>
              {/* 스크롤 가능한 영역 */}
              <p>대화 로그 출력 영역 (추후 API 연동)</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
