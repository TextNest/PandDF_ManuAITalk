find_company= """
SELECT id,name,existingDepartments
FROM company
WHERE code = :code
"""
regist_query = """
INSERT INTO user (user_id ,pw_hash,name,company_name,department,preferred_language,role)VALUES (:user_id,:pw_hash,:name,:company_name,:department,:preferred_language,:role)
"""

login_query = """
SELECT company_name,pw_hash,name,role
FROM user
WHERE user_id = :user_id
"""

user_query = """
SELECT name
FROM google_login
WHERE email = :email
"""

session_search ="""
SELECT id,productId,session_id,lastMessage,messageCount,updatedAt,message
FROM test_session
WHERE email = :email
ORDER BY updatedAt DESC"""

find_message = """
SELECT id,role,content,timestamp,feedback
FROM test_message
WHERE session_id = :session_id AND email = :user_id
ORDER BY timestamp ASC
"""
find_session ="""
SELECT id FROM test_session WHERE email = :email AND session_id = :session_id"""
add_message ="""
INSERT INTO test_message (email,session_id,role,content) VALUES (:email,:session_id,:role,:content)
"""
update_feedback = """
UPDATE test_message SET feedback = :feedback WHERE id = :id AND email = :email"""

add_session ="""
INSERT INTO test_session (email,productId,session_id,lastMessage,messageCount) VALUES(:email,:productId,:session_id,:lastMessage,:messageCount)"""

update_session ="""
UPDATE test_session SET lastMessage = :lastMessage, messageCount = :messageCount , updatedAt = CURRENT_TIMESTAMP
WHERE email = :email AND session_id = :session_id"""


delete_sessions = """
DELETE FROM test_session WHERE email = :email AND session_id = :session_id
"""

delete_message = """
DELETE FROM test_message WHERE email = :email AND session_id = :session_id
"""

guest_find_message= """
SELECT id,role,content,timestamp,feedback
FROM test_message
WHERE session_id = :session_id 
ORDER BY timestamp ASC
"""

find_session_for_rep = """
SELECT tm.session_id
FROM test_message tm
WHERE NOT EXISTS (SELECT 1 FROM test_report r WHERE r.session_id = tm.session_id)
GROUP BY tm.session_id
HAVING MAX(tm.`timestamp`) < NOW() - INTERVAL 30 MINUTE
ORDER BY MAX(tm.`timestamp`) ASC
LIMIT 200;
"""

find_message_for_rep = """
SELECT role, content, timestamp, feedback
FROM test_message
WHERE session_id = :sid
ORDER BY `timestamp` ASC;
"""

find_product_for_rep = """
SELECT productId as product_id
FROM test_session
WHERE session_id = :sid;
"""

reset_all_rep = """
TRUNCATE TABLE test_report;
"""

report_query = """
INSERT INTO test_report (
    session_id, product_id, status, content, timestamp_s, timestamp_e, positive, negative, satisfaction 
) VALUES (
    :sid, :pid, :stat, :sum, :ts, :te, :pos, :neg, :satis
)
ON DUPLICATE KEY UPDATE
    product_id = VALUES(product_id),
    status = VALUES(status),
    content = VALUES(content),
    timestamp_s = VALUES(timestamp_s),
    timestamp_e = VALUES(timestamp_e),
    positive = VALUES(positive),
    negative = VALUES(negative),
    satisfaction = VALUES(satisfaction);
"""

# ---------- FAQ 관련 쿼리 ----------
# 목록 조회 (필터링 가능)
find_faq = """
SELECT
    internal_id,
    faq_id,
    question,
    answer,
    category,
    tags,
    product_id,
    product_name,
    status,
    is_auto_generated,
    source,
    view_count,
    helpful_count,
    created_at,
    updated_at,
    created_by
FROM test_faqs f
WHERE 1=1
"""

# 질문 목록 조회(faq_id)
find_faq_by_id = """
SELECT
    internal_id,
    faq_id,
    question,
    answer,
    category,
    tags,
    product_id,
    product_name,
    status,
    is_auto_generated,
    source,
    view_count,
    helpful_count,
    created_at,
    updated_at,
    created_by
FROM
    test_faqs
WHERE
    faq_id=:faq_id
;
"""

# 질문 목록 조회(product_id)
find_faq_questions_by_product = """
SELECT question
FROM test_faqs
WHERE product_id = :product_id;
"""

# 생성
create_faq = """
INSERT INTO test_faqs (
    faq_id, question, answer, category, tags, product_id, product_name,
    status, is_auto_generated, source, view_count, helpful_count, created_by    
) VALUES (
    :faq_id, :question, :answer, :category, :tags, :product_id, :product_name,
    :status, :is_auto_generated, :source, :view_count, :helpful_count, :created_by
);
"""

# 수정
update_faq = """
UPDATE test_faqs
SET 
    question = COALESCE(:question, question),
    answer = COALESCE(:answer, answer),
    category = COALESCE(:category, category),
    tags = COALESCE(:tags, tags),
    product_id = COALESCE(:product_id, product_id),
    product_name = COALESCE(:product_name, product_name),
    status = COALESCE(:status, status),
    is_auto_generated = COALESCE(:is_auto_generated, is_auto_generated),
    source = COALESCE(:source, source)
WHERE faq_id = :faq_id;
"""

# 삭제
delete_faq = """
DELETE FROM test_faqs
WHERE faq_id = :faq_id;
"""

# 자동 생성 시 사용할 메시지 고르기
find_faq_messages = """
SELECT 
    m.role,
    m.content,
    m.session_id,
    p.product_id,
    p.product_name,
    p.category,
    m.timestamp,
    m.tool_name
FROM test_message m
JOIN test_session s ON m.session_id = s.session_id
JOIN test_products p ON s.productId = p.product_id
WHERE m.timestamp >= :start_date
ORDER BY m.id
;
"""

# 자동 생성 로그 생성
create_faq_generation_log = """
INSERT INTO test_faq_generation_log (
    generation_id, status, messages_analyzed,
    questions_extracted, faqs_created, created_by
) VALUES (
    :generation_id, :status, :messages_analyzed,
    :questions_extracted, :faqs_created, :created_by
);
"""

# 자동 생성 로그 업데이트
update_faq_generation_log = """
UPDATE test_faq_generation_log
SET 
    completed_at = :completed_at,
    status = :status,
    messages_analyzed = COALESCE(:messages_analyzed, messages_analyzed),
    questions_extracted = COALESCE(:questions_extracted, questions_extracted),
    faqs_created = COALESCE(:faqs_created, faqs_created),
    error_message = :error_message
WHERE generation_id = :generation_id;
"""

# ---------- 제품관리, AR 관련 쿼리 ----------
# 전체 제품 조회
find_all_product = "SELECT * FROM test_products ORDER BY created_at DESC;"

# 제품 조회 (제품 코드로)
find_product_id = "SELECT * FROM test_products WHERE product_id = :product_id;"

# 제품 삭제
delete_product_query = """
DELETE FROM test_products
WHERE product_id = :product_id;
"""

# 제품 상태 업데이트 (analysis_status만)
update_product_status = """
UPDATE test_products
SET analysis_status = :analysis_status
WHERE product_id = :product_id;
"""