'use client';

import React from 'react';
import styles from './page.module.css';

export default function SuperAdminPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>슈퍼 관리자 대시보드</h1>
        <p>시스템 전체를 관리합니다</p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🏢</div>
          <div className={styles.statContent}>
            <h3>전체 기업</h3>
            <p className={styles.statNumber}>5</p>
            <span className={styles.statChange}>+2 이번 달</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>👥</div>
          <div className={styles.statContent}>
            <h3>전체 사용자</h3>
            <p className={styles.statNumber}>47</p>
            <span className={styles.statChange}>+8 이번 주</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>📄</div>
          <div className={styles.statContent}>
            <h3>전체 문서</h3>
            <p className={styles.statNumber}>234</p>
            <span className={styles.statChange}>+15 오늘</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>💬</div>
          <div className={styles.statContent}>
            <h3>전체 질문</h3>
            <p className={styles.statNumber}>1,847</p>
            <span className={styles.statChange}>+52 오늘</span>
          </div>
        </div>
      </div>

      <div className={styles.recentActivity}>
        <h2>최근 활동</h2>
        <div className={styles.activityList}>
          <div className={styles.activityItem}>
            <span className={styles.activityTime}>10분 전</span>
            <span className={styles.activityText}>삼성전자에서 새 문서 업로드</span>
          </div>
          <div className={styles.activityItem}>
            <span className={styles.activityTime}>25분 전</span>
            <span className={styles.activityText}>LG전자 관리자 계정 생성</span>
          </div>
          <div className={styles.activityItem}>
            <span className={styles.activityTime}>1시간 전</span>
            <span className={styles.activityText}>현대자동차 기업 등록</span>
          </div>
        </div>
      </div>
    </div>
  );
}