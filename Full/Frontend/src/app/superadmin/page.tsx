'use client';

import React, { useEffect, useState } from 'react';
import styles from './page.module.css';
import { getSuperAdminStats, SuperAdminStats } from '@/lib/api/dashboard';

export default function SuperAdminPage() {
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getSuperAdminStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch super admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className={styles.container}>로딩 중...</div>;
  }

  if (!stats) {
    return <div className={styles.container}>데이터를 불러올 수 없습니다.</div>;
  }

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
            <p className={styles.statNumber}>{stats.total_companies}</p>
            {/* <span className={styles.statChange}>+2 이번 달</span> */}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>👥</div>
          <div className={styles.statContent}>
            <h3>전체 관리자</h3>
            <p className={styles.statNumber}>{stats.total_users}</p>
            {/* <span className={styles.statChange}>+8 이번 주</span> */}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>📄</div>
          <div className={styles.statContent}>
            <h3>전체 문서</h3>
            <p className={styles.statNumber}>{stats.total_documents}</p>
            {/* <span className={styles.statChange}>+15 오늘</span> */}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>💬</div>
          <div className={styles.statContent}>
            <h3>전체 질문</h3>
            <p className={styles.statNumber}>{stats.total_questions.toLocaleString()}</p>
            {/* <span className={styles.statChange}>+52 오늘</span> */}
          </div>
        </div>
      </div>

      <div className={styles.recentActivity}>
        <h2>최근 활동</h2>
        <div className={styles.activityList}>
          {stats.recent_activity && stats.recent_activity.length > 0 ? (
            stats.recent_activity.map((activity, index) => (
              <div key={index} className={styles.activityItem}>
                <span className={styles.activityTime}>
                  {new Date(activity.created_at).toLocaleDateString()}
                </span>
                <span className={styles.activityText}>
                  {activity.content}
                </span>
              </div>
            ))
          ) : (
            <div className={styles.activityItem}>최근 활동이 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}