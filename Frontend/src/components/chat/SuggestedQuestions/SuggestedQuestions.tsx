// ============================================
// 📄 8. src/components/chat/SuggestedQuestions/SuggestedQuestions.tsx
// ============================================
// 추천 질문 컴포넌트
// ============================================

import styles from './SuggestedQuestions.module.css';

interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export default function SuggestedQuestions({ 
  questions, 
  onSelect 
}: SuggestedQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <div className={styles.container}>
      <p className={styles.title}>추천 질문</p>
      <div className={styles.questions}>
        {questions.map((question, index) => (
          <button
            key={index}
            className={styles.questionChip}
            onClick={() => onSelect(question)}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}