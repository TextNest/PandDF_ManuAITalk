'use client';

import React, { useState } from 'react';
import styles from './settings-page.module.css';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    siteName: 'SeShat',
    maxUploadSize: '10',
    sessionTimeout: '30',
    enableRegistration: true,
    enableNotifications: true,
    maintenanceMode: false,
  });

  const handleSave = () => {
    // TODO: API 호출
    alert('설정이 저장되었습니다.');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>시스템 설정</h1>
          <p>시스템 전반적인 설정을 관리합니다</p>
        </div>
        <button className={styles.saveButton} onClick={handleSave}>
          💾 설정 저장
        </button>
      </div>

      <div className={styles.sections}>
        {/* 기본 설정 */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>⚙️ 기본 설정</h2>
            <p>시스템의 기본적인 설정을 관리합니다</p>
          </div>

          <div className={styles.settingGroup}>
            <div className={styles.settingItem}>
              <label htmlFor="siteName">사이트 이름</label>
              <input
                id="siteName"
                type="text"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className={styles.input}
              />
            </div>

            <div className={styles.settingItem}>
              <label htmlFor="maxUploadSize">최대 업로드 크기 (MB)</label>
              <input
                id="maxUploadSize"
                type="number"
                value={settings.maxUploadSize}
                onChange={(e) => setSettings({ ...settings, maxUploadSize: e.target.value })}
                className={styles.input}
              />
            </div>

            <div className={styles.settingItem}>
              <label htmlFor="sessionTimeout">세션 타임아웃 (분)</label>
              <input
                id="sessionTimeout"
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
                className={styles.input}
              />
            </div>
          </div>
        </section>

        {/* 기능 설정 */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>🔧 기능 설정</h2>
            <p>시스템 기능을 활성화/비활성화합니다</p>
          </div>

          <div className={styles.settingGroup}>
            <div className={styles.toggleItem}>
              <div className={styles.toggleInfo}>
                <label>회원가입 활성화</label>
                <p>새로운 기업 관리자의 회원가입을 허용합니다</p>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={settings.enableRegistration}
                  onChange={(e) => setSettings({ ...settings, enableRegistration: e.target.checked })}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.toggleItem}>
              <div className={styles.toggleInfo}>
                <label>알림 활성화</label>
                <p>시스템 알림 및 이메일 알림을 활성화합니다</p>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={settings.enableNotifications}
                  onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.toggleItem}>
              <div className={styles.toggleInfo}>
                <label>⚠️ 유지보수 모드</label>
                <p>일반 사용자 접근을 차단하고 유지보수 페이지를 표시합니다</p>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
          </div>
        </section>

        {/* API 설정 */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>🔌 API 설정</h2>
            <p>외부 API 연동 설정을 관리합니다</p>
          </div>

          <div className={styles.settingGroup}>
            <div className={styles.settingItem}>
              <label htmlFor="openaiKey">OpenAI API Key</label>
              <div className={styles.apiKeyInput}>
                <input
                  id="openaiKey"
                  type="password"
                  placeholder="sk-..."
                  className={styles.input}
                />
                <button className={styles.testButton}>테스트</button>
              </div>
              <small className={styles.hint}>AI 분석에 사용되는 API 키입니다</small>
            </div>

            <div className={styles.settingItem}>
              <label htmlFor="embeddingModel">임베딩 모델</label>
              <select id="embeddingModel" className={styles.select}>
                <option>text-embedding-ada-002</option>
                <option>text-embedding-3-small</option>
                <option>text-embedding-3-large</option>
              </select>
            </div>

            <div className={styles.settingItem}>
              <label htmlFor="chatModel">채팅 모델</label>
              <select id="chatModel" className={styles.select}>
                <option>gpt-4-turbo-preview</option>
                <option>gpt-4</option>
                <option>gpt-3.5-turbo</option>
              </select>
            </div>
          </div>
        </section>

        {/* 데이터 관리 */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>💾 데이터 관리</h2>
            <p>데이터 백업 및 초기화를 관리합니다</p>
          </div>

          <div className={styles.actionGroup}>
            <div className={styles.actionItem}>
              <div className={styles.actionInfo}>
                <h3>데이터 백업</h3>
                <p>현재 시스템 데이터를 백업합니다</p>
              </div>
              <button className={styles.actionButton}>📥 백업 생성</button>
            </div>

            <div className={styles.actionItem}>
              <div className={styles.actionInfo}>
                <h3>로그 다운로드</h3>
                <p>시스템 로그 파일을 다운로드합니다</p>
              </div>
              <button className={styles.actionButton}>📄 다운로드</button>
            </div>

            <div className={styles.actionItem}>
              <div className={styles.actionInfo}>
                <h3>⚠️ 캐시 초기화</h3>
                <p>시스템 캐시를 초기화합니다 (신중히 사용하세요)</p>
              </div>
              <button className={styles.dangerButton}>🗑️ 초기화</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}