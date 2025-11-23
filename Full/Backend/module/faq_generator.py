from typing import List, Tuple, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, timedelta
from core.query import (
    find_faq_messages,
    find_faq_questions_by_product,
    create_faq,
    create_faq_generation_log,
    update_faq_generation_log
)
from models.faq import generate_short_id
from models.faq_generation_log import generate_short_uuid
import numpy as np
import logging
from sentence_transformers import SentenceTransformer
from collections import defaultdict
import re

logger = logging.getLogger(__name__)

embedding_model = SentenceTransformer('distiluse-base-multilingual-cased-v2')

class FAQGenerator:
    """
    제품별 FAQ 자동 생성
    - Session, Product 테이블 조인
    - 로깅
    """
    
    @staticmethod
    async def extract_qa_pairs_by_product(
        session: AsyncSession,
        days_range: int
    ) -> Dict[str, Dict[str, any]]:
        """
        조인을 통해 제품별 User-Assistant 쌍 추출
        
        Returns:
            {
                'WM-2024': {
                    'product_name': '세탁기 2024',
                    'product_id': 'PROD_001',
                    'qa_pairs': [(user, assistant), ...],
                    'qa_count': 45
                },
                'AC-2024': {...},
                ...
            }
        """
        start_date = datetime.utcnow() - timedelta(days=days_range)
        
        # [JOIN] message - session - product
        query = text(find_faq_messages)
        params = {"start_date": start_date}
        
        result = await session.execute(query, params)
        messages = result.mappings().all()
        
        logger.info(f"조인된 메시지 수: {len(messages)}")
        
        if len(messages) == 0:
            logger.warning(f"기간 {days_range}일 내에 조인된 메시지가 없습니다. (시작일: {start_date})")
            return {}
        
        # 제품별 QA 쌍 저장
        product_qa_pairs: Dict[str, Dict] = defaultdict(
            lambda: {
                'product_name': None,
                'product_id': None,
                'category': None,
                'qa_pairs': []
            }
        )

        # 세션별로 메시지를 그룹화한 후 user-assistant 매칭
        messages_by_session = defaultdict(list)
        for row in messages:
            messages_by_session[row['session_id']].append({
                'role': row.get('role'),
                'content': row.get('content'),
                'product_id': row.get('product_id'),
                'product_name': row.get('product_name'),
                'category': row.get('category'),
                'timestamp': row.get('timestamp'),
                'tool_name': row.get('tool_name')  # 추가: tool_name도 추적
            })

        user_count = 0
        assistant_count = 0
        qa_pair_count = 0
        
        # 세션별로 순회하면서 user-assistant 쌍 매칭
        for session_id, session_messages in messages_by_session.items():
            pending_user = None
            pending_product_id = None
            pending_tool_name = None   # tool_name 추적
            
            for msg in session_messages:
                role = msg['role']
                content = msg['content']
                product_id = msg['product_id']
                product_name = msg['product_name']
                category = msg['category']
                tool_name = msg['tool_name']
                
                # product_id가 없으면 건너뛰기
                if not product_id:
                    logger.debug(f"product_id가 없는 메시지 건너뜀: session_id={session_id}, role={role}")
                    continue
                
                # 제품 정보 저장
                if product_name:
                    product_qa_pairs[product_id]['product_name'] = product_name
                if category:
                    product_qa_pairs[product_id]['category'] = category
                if product_id:
                    product_qa_pairs[product_id]['product_id'] = product_id
                
                if role == 'user':
                    # tool_name이 None/빈값은 FAQ 후보에서 제외
                    if not tool_name:
                        continue
                    pending_user = content
                    pending_product_id = product_id
                    pending_tool_name = tool_name
                    user_count += 1
                    logger.debug(f"User 메시지 저장: product_id={product_id}, session_id={session_id}")
                
                elif role == 'assistant':
                    assistant_count += 1
                    # pending_user가 있고, product_id가 일치할 때만 매칭
                    if pending_user and pending_product_id == product_id and pending_tool_name == "질문":
                        product_qa_pairs[product_id]['qa_pairs'].append((pending_user, content))
                        qa_pair_count += 1
                        logger.debug(f"QA 쌍 생성: product_id={product_id}, Q: {pending_user[:50]}...")
                        pending_user = None
                        pending_product_id = None
                        pending_tool_name = None
                    else:
                        logger.debug(f"대응하는 user 메시지가 없는 assistant 메시지: product_id={product_id}, session_id={session_id}")
        
        for product_id, data in product_qa_pairs.items():
            data['qa_count'] = len(data['qa_pairs'])
            logger.info(f"제품 {product_id} ({data['product_name']}): {data['qa_count']}개 QA 쌍")
        
        logger.info(f"전체 통계: User 메시지 {user_count}개, Assistant 메시지 {assistant_count}개, QA 쌍 {qa_pair_count}개")
    
        return dict(product_qa_pairs)
    
    @staticmethod
    def filter_valid_questions(
        questions: List[str],
        min_length: int = 3,
        excluded_patterns: List[str] = None,
        excluded_regex: List[str] = None
    ) -> List[Tuple[int, str]]:
        """
        의미 없는 질문 필터링 (예: "ㅎㅇ" 같은 잡음)
        
        Args:
            questions: 모든 질문 리스트
            min_length: 최소 질문 길이
            excluded_patterns: 제외할 패턴 리스트(단순 문자열)
            exclude_regex: 정규표현식 패턴 리스트
        
        Returns:
            [(original_index, filtered_question), ...]
            원본 인덱스를 유지하여 나중에 qa_pairs로 매핑 가능
        """
        if excluded_patterns is None:
            excluded_patterns = ['ㅎㅇ', 'ㅋㅋ', 'ㄱㄱ', 'ㅇㅇ', 'ㅈㅂ', '?', '??']
        if excluded_regex is None:
            excluded_regex = [
                r'^[ㄱ-ㅎㅏ-ㅣ]+$',        # 한글 초성/모음만 (예: "ㅎㅇ", "ㅂㅈ")
                r'^\d+$',                 # 숫자만 (예: "123")
                r'^[?!]+$',               # 물음표/느낌표만 (예: "???")
                r'^[^\w\s가-힣]+$',        # 특수문자만 (한글/영문/숫자 제외)
            ]
        valid = []
        for idx, q in enumerate(questions):
            q_stripped = q.strip()
            
            # 길이 확인
            if len(q_stripped) < min_length:
                logger.debug(f"  [필터링] 너무 짧은 질문 (길이 {len(q_stripped)}): '{q}'")
                continue
            
            # 단순 패턴 확인(스트링)
            if q_stripped in excluded_patterns:
                logger.debug(f"  [필터링] 제외된 패턴: '{q}'")
                continue
            
            # 특수문자만 있는지 확인
            if all(not c.isalnum() for c in q_stripped if c not in ' '):
                logger.debug(f"  [필터링] 특수문자만 있음: '{q}'")
                continue
            
            # 정규표현식 필터링
            excluded = False
            for pattern in excluded_regex:
                if re.fullmatch(pattern, q_stripped):
                    excluded = True
                    break
            if excluded:
                continue    

            valid.append((idx, q_stripped))
        
        logger.info(f"  질문 필터링: {len(questions)}개 → {len(valid)}개")
        return valid

    
    @staticmethod
    def cluster_by_similarity(
        questions: List[str],
        embeddings: np.ndarray,
        threshold: float = 0.8
    ) -> List[Tuple[str, List[int]]]:
        """임베딩으로 유사한 질문 클러스터링"""
        if len(questions) == 0:
            return []
        
        # 임베딩 정규화
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1, norms)  # 0으로 나누기 방지
        normalized_embeddings = embeddings / norms
        
        clusters = []
        assigned = set()
        
        for i, (question, embedding) in enumerate(zip(questions, normalized_embeddings)):
            if i in assigned:
                continue
            
            cluster_indices = [i]
            assigned.add(i)
            
            for j in range(i + 1, len(questions)):
                if j in assigned:
                    continue
                
                # 코사인 유사도 계산 (정규화된 벡터의 내적)
                similarity = np.dot(embedding, normalized_embeddings[j])
                
                if similarity >= threshold:
                    cluster_indices.append(j)
                    assigned.add(j)
            
            # 클러스터가 1개 이상이면 추가 (단일 질문도 포함)
            clusters.append((question, cluster_indices))
        
        logger.debug(f"클러스터링 완료: {len(clusters)}개 클러스터 생성 (임계값: {threshold})")
        
        return clusters
    
    @staticmethod
    def select_best_answer(
        qa_pairs: List[Tuple[str, str]],
        cluster_indices: List[int]
    ) -> str:
        """클러스터 내 최고의 답변 선택"""
        best_answer = ""
        max_length = 0
        
        for idx in cluster_indices:
            answer = qa_pairs[idx][1]
            if len(answer) > max_length:
                max_length = len(answer)
                best_answer = answer
        
        return best_answer

    @staticmethod
    async def generate_faqs_for_products(
        session: AsyncSession,
        days_range: int = 7,
        min_cluster_size: int = 2,        # ← 클러스터 내 QA 쌍 최소 개수
        min_qa_pair_count: int = 3,       # ← 제품 전체 QA 쌍 최소 개수
        similarity_threshold: float = 0.8
    ) -> Dict:
        """
        로깅과 함께 제품별 FAQ 자동 생성
        
        Args:
            days_range: 분석할 대화 기간 (일 단위)
            min_qa_pair_count: 제품별 최소 QA 쌍 개수 (이 개수 이상이어야 클러스터링 실행)
            min_cluster_size: 각 클러스터 내 최소 질문 개수 (이 개수 이상의 클러스터만 FAQ 후보 생성)
            min_qa_pair_count: 제품별 최소 QA 쌍 개수 (예: 3 = 최소 3개의 QA 쌍 필요)
        """
        # [0] 생성 로그 시작
        generation_id = generate_short_uuid()
        
        log_query = text(create_faq_generation_log)
        log_params = {
            'generation_id': generation_id,
            'status': 'processing',
            'messages_analyzed': 0,
            'questions_extracted': 0,
            'faqs_created': 0,
            'created_by': 'PRODUCT_GENERATOR'
        }
        await session.execute(log_query, log_params)
        await session.commit()
        
        logger.info(f"=== FAQ 생성 시작 (ID: {generation_id}, 기간: {days_range}일) ===")
        
        try:
            # [1] 조인을 통해 제품별 QA 쌍 추출
            product_qa_data = await FAQGenerator.extract_qa_pairs_by_product(
                session, days_range
            )
            
            # 전체 메시지 수 집계
            total_messages_analyzed = sum(
                data['qa_count'] * 2  # user + assistant 쌍
                for data in product_qa_data.values()
            )
            
            # 로그 업데이트: 메시지 분석 수
            log_update_query = text(update_faq_generation_log)
            await session.execute(log_update_query, {
                'generation_id': generation_id,
                'messages_analyzed': total_messages_analyzed,
                'completed_at': None,
                'status': 'processing',
                'questions_extracted': None,
                'faqs_created': None,
                'error_message': None
            })
            await session.commit()
            
            logger.info(f"분석한 메시지: {total_messages_analyzed}개")
            
            if not product_qa_data:
                logger.warning("QA 쌍이 없습니다")
                
                # 로그 업데이트: 완료 상태
                log_update_query = text(update_faq_generation_log)
                await session.execute(log_update_query, {
                    'generation_id': generation_id,
                    'completed_at': datetime.utcnow(),
                    'status': 'completed',
                    'messages_analyzed': None,
                    'questions_extracted': None,
                    'faqs_created': None,
                    'error_message': None
                })
                await session.commit()
                
                return {
                    'status': 'insufficient_data',
                    'generation_id': generation_id,
                    'message': 'QA 쌍이 없습니다'
                }
            
            results = {}
            total_created = 0
            total_skipped = 0
            total_questions_extracted = 0
            
            # [2] 각 제품별로 처리
            for product_id, product_data in product_qa_data.items():
                qa_pairs = product_data['qa_pairs']
                product_name = product_data['product_name']
                product_id = product_data['product_id']
                category = product_data['category']
                
                logger.info(f"\n>>> 제품 처리: {product_id} ({product_name})")
                
                # 데이터 부족 확인
                if len(qa_pairs) < min_qa_pair_count:
                    logger.warning(f"  QA 쌍 부족: {len(qa_pairs)}개 (필요: {min_qa_pair_count}개)")
                    results[product_id] = {
                        'status': 'insufficient_data',
                        'product_name': product_name,
                        'product_id': product_id,
                        'created_faqs': 0,
                        'message': f'QA 쌍이 {min_qa_pair_count}개 이상 필요합니다 (현재: {len(qa_pairs)}개)'
                    }
                    continue
                
                # [2-1] User 메시지만 추출 및 임베딩
                user_questions = [pair[0] for pair in qa_pairs]
                logger.info(f"  임베딩 생성 중... ({len(user_questions)}개)")
                
                # [2-1-1] 잡음 질문 필터링
                valid_question_indices = FAQGenerator.filter_valid_questions(
                    user_questions,
                    min_length=3,
                    excluded_patterns=['ㅎㅇ', 'ㅋㅋ', 'ㄱㄱ', 'ㅇㅇ', '?', '??'],  # 필요시 추가
                )

                if len(valid_question_indices) == 0:
                    logger.warning(f"  유효한 질문이 없습니다 (필터링 후)")
                    results[product_id] = {
                        'status': 'insufficient_data',
                        'product_name': product_name,
                        'product_id': product_id,
                        'created_faqs': 0,
                        'message': f'유효한 질문이 없습니다'
                    }
                    continue

                if len(valid_question_indices) < min_qa_pair_count:
                    logger.warning(f"  유효한 질문 부족: {len(valid_question_indices)}개 (필요: {min_qa_pair_count}개)")
                    results[product_id] = {
                        'status': 'insufficient_data',
                        'product_name': product_name,
                        'product_id': product_id,
                        'created_faqs': 0,
                        'message': f'유효한 질문이 {min_qa_pair_count}개 이상 필요합니다'
                    }
                    continue

                # 필터링된 질문만 사용
                filtered_user_questions = [q for _, q in valid_question_indices]
                filtered_qa_indices = [idx for idx, _ in valid_question_indices]

                logger.info(f"  필터링: {len(user_questions)}개 → {len(filtered_user_questions)}개")

                embeddings = embedding_model.encode(
                    filtered_user_questions,  # 필터링된 질문만 임베딩
                    show_progress_bar=False,
                    convert_to_numpy=True
                )

                total_questions_extracted += len(filtered_user_questions)

                # [2-2] 클러스터링
                clusters = FAQGenerator.cluster_by_similarity(
                    filtered_user_questions,
                    embeddings,
                    threshold=similarity_threshold
                )
                
                logger.info(f"  전체 클러스터: {len(clusters)}개")
                
                # [2-3] 최소 크기 필터링
                valid_clusters = [
                    (rep_q, indices)
                    for rep_q, indices in clusters
                    if len(indices) >= min_cluster_size
                ]
                
                logger.info(f"  유효한 클러스터: {len(valid_clusters)}개 / 전체: {len(clusters)}개 (최소 크기: {min_cluster_size})")
                
                if len(valid_clusters) == 0:
                    logger.info(f"  조건과 일치하는 FAQ 후보가 없습니다.")
                    results[product_id] = {
                        'status': 'insufficient_data',
                        'product_name': product_name,
                        'product_id': product_id,
                        'created_faqs': 0,
                        'message': '조건과 일치하는 FAQ 후보가 없습니다.'
                    }
                    continue
                
                # [2-4] 이 제품의 기존 FAQ 확인
                existing_query = text(find_faq_questions_by_product)
                existing_result = await session.execute(
                    existing_query,
                    {'product_id': product_id}
                )
                existing_questions = {row['question'] for row in existing_result.mappings().all()}
                
                logger.info(f"  기존 FAQ: {len(existing_questions)}개")
                
                # [2-5] 모든 유효한 클러스터의 대표 질문을 FAQ로 생성
                created_count = 0
                skipped_count = 0
                
                for cluster_idx, (representative_question, cluster_indices) in enumerate(valid_clusters, 1):
                    # 제품 내 중복 확인
                    if representative_question in existing_questions:
                        logger.info(f"    [{cluster_idx}] [중복] {representative_question}")
                        skipped_count += 1
                        continue

                    # 필터링된 인덱스를 원본 인덱스로 변환
                    original_cluster_indices = [filtered_qa_indices[i] for i in cluster_indices]
                    
                    # 최고의 답변 선택
                    best_answer = FAQGenerator.select_best_answer(
                        qa_pairs, original_cluster_indices  
                    )
                    
                    # FAQ 생성
                    faq_id = generate_short_id()
                    
                    create_query = text(create_faq)
                    create_params = {
                        'faq_id': faq_id,
                        'question': representative_question,
                        'answer': best_answer,
                        'category': category,
                        'tags': None,
                        'product_id': product_id,
                        'product_name': product_name,
                        'status': 'draft',
                        'is_auto_generated': True,
                        'source': 'chatbot',
                        'view_count': 0,
                        'helpful_count': 0,
                        'created_by': f'PRODUCT_GENERATOR (제품: {product_id}, 클러스터: {len(cluster_indices)}개)'
                    }
                    
                    await session.execute(create_query, create_params)
                    created_count += 1
                    
                    logger.info(f"    [생성] {representative_question} (유사: {len(cluster_indices)}개)")
                
                await session.commit()
                
                results[product_id] = {
                    'status': 'success',
                    'product_name': product_name,
                    'product_id': product_id,
                    'created_faqs': created_count,
                    'skipped_duplicates': skipped_count,
                    'total_clusters': len(valid_clusters),
                    'total_qa_pairs': len(qa_pairs),
                    'message': f'[{product_id} - {product_name}] {created_count}개 FAQ 생성'
                }
                
                total_created += created_count
                total_skipped += skipped_count
                
                logger.info(f"  완료: {created_count}개 생성, {skipped_count}개 중복")
            
            logger.info(f"\n=== 모든 제품 처리 완료 (총 생성: {total_created}, 중복: {total_skipped}) ===")
            
             # [3] 로그 업데이트
            log_update_query = text(update_faq_generation_log)
            await session.execute(log_update_query, {
                'generation_id': generation_id,
                'completed_at': datetime.utcnow(),
                'status': 'completed',
                'messages_analyzed': None,
                'questions_extracted': total_questions_extracted,
                'faqs_created': total_created,
                'error_message': None
            })
            await session.commit()
            
            # FAQ가 하나도 생성되지 않았으면 insufficient_data 반환
            if total_created == 0:
                return {
                    'status': 'insufficient_data',
                    'generation_id': generation_id,
                    'products': results,
                    'total_products': len(results),
                    'total_created_faqs': total_created,
                    'total_skipped': total_skipped,
                    'messages_analyzed': total_messages_analyzed,
                    'questions_extracted': total_questions_extracted,
                    'message': '조건을 만족하는 FAQ 후보가 없습니다.'
                }
            
            return {
                'status': 'success',
                'generation_id': generation_id,
                'products': results,
                'total_products': len(results),
                'total_created_faqs': total_created,
                'total_skipped': total_skipped,
                'messages_analyzed': total_messages_analyzed,
                'questions_extracted': total_questions_extracted,
                'summary': f'{len([r for r in results.values() if r["status"] == "success"])}개 제품 처리, 총 {total_created}개 FAQ 생성'
            }
        
        except Exception as e:
            logger.error(f"FAQ 생성 중 에러: {str(e)}", exc_info=True)
            
            # [3] 로그 업데이트 (실패)
            log_update_query = text(update_faq_generation_log)
            await session.execute(log_update_query, {
                'generation_id': generation_id,
                'completed_at': datetime.utcnow(),
                'status': 'failed',
                'messages_analyzed': None,
                'questions_extracted': None,
                'faqs_created': None,
                'error_message': str(e)[:1000]  # 1000자 제한
            })
            await session.commit()
            
            return {
                'status': 'error',
                'generation_id': generation_id,
                'error': str(e)
            }