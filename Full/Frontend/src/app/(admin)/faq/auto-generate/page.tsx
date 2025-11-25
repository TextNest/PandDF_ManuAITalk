'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Calendar, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import apiClient from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { toast } from '@/store/useToastStore';
import styles from './auto-generate-page.module.css';

export default function FAQAutoGeneratePage() {
  const router = useRouter();
  
  // 기본값 함수
  const getDefaultEndDate = () => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  };
  
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  };
  
  // State
  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(getDefaultEndDate());
  const [minQaPairCount, setMinQaPairCount] = useState<string>('3');
  const [minClusterSize, setMinClusterSize] = useState<string>('2');
  const [similarityThreshold, setSimilarityThreshold] = useState<string>('0.8');
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [hasAttempted, setHasAttempted] = useState(false);
  
  // 에러 상태
  const [minQaPairCountError, setMinQaPairCountError] = useState<string>('');
  const [minClusterSizeError, setMinClusterSizeError] = useState<string>('');
  const [similarityThresholdError, setSimilarityThresholdError] = useState<string>('');

  // 분석 기간 계산
  const calculateDaysRange = (start: string, end: string): number => {
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 숫자 입력 핸들러 생성 함수
  const createNumberInputHandler = (
    setValue: (value: string) => void,
    setError: (error: string) => void,
    validate: (num: number) => boolean,
    errorMessage: string,
    defaultValue: string
  ) => {
    return {
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setValue(value);
        
        if (value === '') {
          setError('');
        } else {
          const num = parseFloat(value);
          if (isNaN(num)) {
            setError('숫자를 입력해주세요.');
          } else if (!validate(num)) {
            setError(errorMessage);
          } else {
            setError('');
          }
        }
      },
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
        const value = e.target.value.trim();
        const num = parseFloat(value);
        if (value === '' || isNaN(num) || !validate(num)) {
          setValue(defaultValue);
          setError('');
        }
      },
    };
  };

  // FAQ 생성 핸들러
  const handleGenerate = async () => {
    // 날짜 유효성 검사
    if (!startDate || !endDate) {
      setErrorMessage('시작일과 종료일을 모두 선택해주세요.');
      return;
    }

    const daysRange = calculateDaysRange(startDate, endDate);
    if (daysRange < 1) {
      setErrorMessage('종료일은 시작일보다 이후여야 합니다.');
      return;
    }

    // 입력값 에러 체크
    if (minQaPairCountError || minClusterSizeError || similarityThresholdError) {
      setErrorMessage('입력값을 확인해주세요.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // API 호출 파라미터 준비
      const minClusterSizeNum = parseInt(minClusterSize) || 2;
      const minQaPairCountNum = parseInt(minQaPairCount) || 3;
      const similarityThresholdNum = parseFloat(similarityThreshold) || 0.8;

      const response = await apiClient.post(API_ENDPOINTS.FAQ.AUTO_GENERATE, null, {
        params: {
          days_range: daysRange,
          min_cluster_size: minClusterSizeNum,
          min_qa_pair_count: minQaPairCountNum,
          similarity_threshold: similarityThresholdNum,
        },
      });

      const status = response.data?.status;
      const totalCreated = response.data?.total_created_faqs ?? 0;
      
      setHasAttempted(true);

      // 응답 상태에 따른 처리
      if (status === 'success' && totalCreated > 0) {
        setSuccessMessage(`${totalCreated}개의 FAQ 후보가 생성되었습니다. FAQ 목록에서 확인할 수 있습니다.`);
        toast.success('FAQ 자동 생성이 완료되었습니다.');
        setErrorMessage('');
      } else if (status === 'insufficient_data' || (status === 'success' && totalCreated === 0)) {
        const message = response.data?.message || '조건과 일치하는 FAQ 후보가 없습니다.';
        setErrorMessage(message);
        setSuccessMessage('');
        toast.warning(message);
      } else if (status === 'error') {
        const message = response.data?.message || response.data?.error || 'FAQ 자동 생성에 실패했습니다.';
        setErrorMessage(message);
        setSuccessMessage('');
        toast.error(message);
      } else {
        console.error('예상치 못한 응답:', response.data);
        // totalCreated를 확인하여 처리
        if (totalCreated > 0) {
          setSuccessMessage(`${totalCreated}개의 FAQ 후보가 생성되었습니다. FAQ 목록에서 확인할 수 있습니다.`);
          toast.success('FAQ 자동 생성이 완료되었습니다.');
          setErrorMessage('');
        } else {
          setErrorMessage('조건과 일치하는 FAQ 후보가 없습니다.');
          setSuccessMessage('');
          toast.warning('조건과 일치하는 FAQ 후보가 없습니다.');
        }
      }
    } catch (error: any) {
      console.error('FAQ 자동 생성 실패:', error);
      setHasAttempted(true);
      let errorMsg = 'FAQ 자동 생성에 실패했습니다.';
      if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      } else if (error.message) {
        errorMsg = error.message;
      }
      setErrorMessage(errorMsg);
      setSuccessMessage('');
      toast.error(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  // FAQ 목록으로 이동
  const handleGoToFAQList = () => {
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
            분석 설정
          </h3>
          
          {/* 입력 필드 */}
          <div className={styles.inputs}>
            <div className={styles.dateInputs}>
              <Input
                type="date"
                label="시작일"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
                fullWidth
              />
              <Input
                type="date"
                label="종료일"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={getDefaultEndDate()}
                fullWidth
              />
            </div>
            {startDate && endDate && (
              <div className={styles.dateInfo}>
                <span>분석 기간: {calculateDaysRange(startDate, endDate)}일</span>
              </div>
            )}
            <Input
              type="number"
              label="이 개수 이상의 대화가 있는 제품만 분석합니다"
              value={minQaPairCount}
              error={minQaPairCountError}
              {...createNumberInputHandler(
                setMinQaPairCount,
                setMinQaPairCountError,
                (num) => num >= 1,
                '1 이상의 값을 입력해주세요.',
                '3'
              )}
              min={1}
              fullWidth
            />
            <Input
              type="number"
              label="같은 주제로 묶인 질문이 이 개수 이상일 때 FAQ로 생성합니다"
              value={minClusterSize}
              error={minClusterSizeError}
              {...createNumberInputHandler(
                setMinClusterSize,
                setMinClusterSizeError,
                (num) => num >= 1,
                '1 이상의 값을 입력해주세요.',
                '2'
              )}
              min={1}
              fullWidth
            />
            <Input
              type="number"
              label="유사도 임계값 (0.0 ~ 1.0)"
              value={similarityThreshold}
              error={similarityThresholdError}
              {...createNumberInputHandler(
                setSimilarityThreshold,
                setSimilarityThresholdError,
                (num) => num >= 0 && num <= 1,
                '0과 1 사이의 값을 입력해주세요.',
                '0.8'
              )}
              min={0}
              max={1}
              step={0.1}
              fullWidth
            />
          </div>

          <div className={styles.infoBox}>
            <TrendingUp size={20} />
            <div>
              <h4>분석 방법</h4>
              <p>지정한 기간 동안의 사용자 질문을 AI가 분석하여 빈도가 높고 패턴이 유사한 질문들을 자동으로 그룹화합니다.</p>
            </div>
          </div>

          {errorMessage && (
            <div className={styles.errorBox}>
              <AlertCircle size={20} />
              <p>{errorMessage}</p>
            </div>
          )}

          {successMessage && (
            <div className={styles.successBox}>
              <CheckCircle size={20} />
              <p>{successMessage}</p>
            </div>
          )}

          {isGenerating && (
            <div className={styles.loadingBox}>
              <Sparkles size={20} />
              <p>FAQ를 생성하는 중입니다...</p>
            </div>
          )}

          {!isGenerating && !successMessage && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleGenerate}
            >
              <Sparkles size={20} />
              FAQ 생성하기
            </Button>
          )}

          {hasAttempted && !isGenerating && (
            <Button
              variant={successMessage ? "primary" : "secondary"} 
              size="lg"
              fullWidth
              onClick={handleGoToFAQList}
              style={{ marginTop: successMessage ? 0 : '1rem' }}
            >
              FAQ 목록으로 돌아가기
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}