# ---------- 로그인 / 기업 회원 가입 ----------
find_company_and_department = """
SELECT
    c.company_internal_id as id,
    c.name,
    GROUP_CONCAT(DISTINCT a.department SEPARATOR ',') as existingDepartments
FROM
    tb_company c
    LEFT JOIN tb_admin a
    ON c.company_internal_id = a.company_internal_id
WHERE
    c.code = :code
GROUP BY
    c.company_internal_id, c.name
"""

regist_query = """
INSERT INTO tb_admin (
    email, password_hash, name, company_internal_id, department
) VALUES 
(:email, :password_hash, :name, :company_internal_id,:department)
"""

login_query = """
SELECT
    a.admin_internal_id,
    c.company_internal_id,
    c.name as company_name,
    a.password_hash as pw_hash,
    a.name as name,
    a.is_super as role
FROM 
    tb_admin a
    LEFT JOIN tb_company c
    ON a.company_internal_id = c.company_internal_id
WHERE
    email = :email
"""

user_query = """
SELECT
    user_internal_id,
    name
FROM
    tb_user
WHERE
    email = :email
"""

user_regist_query = """
INSERT INTO tb_user (
    name, email
) VALUES 
(:name, :email)
"""

# ---------- 채팅 관련 ----------

session_search ="""
SELECT 
    session.session_internal_id as id,
    session.session_id,
    product.product_id,
    session.last_message,
    session.message_count,
    session.updated_at
FROM
    tb_session as session join tb_product as product on session.product_internal_id = product.product_internal_id
WHERE
    user_internal_id = :user_internal_id
ORDER BY
    updated_at DESC
"""

add_session ="""
INSERT INTO tb_session (user_internal_id,product_internal_id,session_id) 
VALUES(:user_internal_id,
(SELECT product_internal_id FROM tb_product WHERE product_id = :productId),
:session_id)"""

find_message = """
SELECT message_internal_id as id,role,content,created_at,feedback
FROM tb_message
WHERE session_internal_id = (SELECT session_internal_id FROM tb_session WHERE session_id = :session_id)
ORDER BY created_at ASC
"""
find_session ="""
SELECT session_internal_id FROM tb_session WHERE session_id = :session_id"""
add_message ="""
INSERT INTO tb_message (session_internal_id,role,content,tool_name) 
VALUES ((SELECT session_internal_id FROM tb_session WHERE session_id = :session_id)
,:role,:content,:tool_name)
"""
update_feedback =    """
UPDATE tb_message SET feedback = :feedback WHERE message_internal_id = :id"""

update_session ="""
UPDATE tb_session SET last_message = :lastMessage, message_count = :messageCount , updated_at = CURRENT_TIMESTAMP
WHERE user_internal_id = :user_internal_id AND session_id = :session_id"""


delete_sessions = """
DELETE FROM test_session WHERE user_internal_id = :user_internal_id AND session_id = :session_id
"""

delete_message = """
DELETE FROM test_message WHERE session_internal_id = (SELECT session_internal_id FROM tb_session WHERE session_id = :session_id)
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

# ---------- report ----------

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

class LogQuery:
    view_recent = """
    SELECT
        r.session_id as sessionId,
        r.status,
        r.product_id as productId,
        r.satisfaction,
        (
            SELECT m.content
            FROM test_message AS m
            WHERE m.session_id = r.session_id
            ORDER BY m.`timestamp` ASC, m.id ASC
            LIMIT 1
        ) AS message
    FROM test_report AS r
    ORDER BY r.timestamp_e DESC
    LIMIT 3
    """
    
    product_info = """
    SELECT DISTINCT product_id as productId FROM test_products
    """

    view_session_head = """
    SELECT
        r.session_id as sessionId,
        r.status,
        r.product_id as productId,
        r.satisfaction,
        DATE_FORMAT(r.timestamp_e, '%Y-%m-%d %H:%i:%s') as endedAt,
        (
            SELECT m.content
            FROM test_message AS m
            WHERE m.session_id = r.session_id
            ORDER BY m.`timestamp` ASC, m.id ASC
            LIMIT 1
        ) AS message
    FROM test_report AS r
    """

    view_session_tail = """
    ORDER BY endedAt DESC
    LIMIT :limit OFFSET :offset
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
    faq_id=:faq_id;
"""

# 질문 목록 조회(product_id)
find_faq_questions_by_product = """
SELECT 
    question
FROM
    test_faqs
WHERE
    product_id = :product_id;
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
JOIN tb_product p ON s.productId = p.product_id
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
# 전체 제품 조회 -> 특정 회사 제품 조회로 변경
find_all_product = """
SELECT * FROM tb_product
WHERE is_active = 1
ORDER BY created_at DESC;
"""

# 제품 조회 (제품 코드로)
find_product_id = "SELECT * FROM tb_product WHERE product_id = :product_id;"

# 제품 조회 (제품 코드로) with 회사명 (수정 페이지용)
find_product_with_company_name_by_id = """
SELECT p.*, c.name AS company_name
FROM tb_product p
LEFT JOIN tb_company c ON p.company_internal_id = c.company_internal_id
WHERE p.product_id = :product_id;
"""

# 제품 삭제
delete_product_query = """
DELETE FROM tb_product
WHERE product_id = :product_id;
"""

# 제품 상태 업데이트 (status만)
update_product_status = """
UPDATE tb_product
SET status = :status
WHERE product_id = :product_id;
"""

# 회사 관리자용 - 특정 회사 제품 조회
find_products_by_company_id = """
SELECT * FROM tb_product
WHERE company_internal_id = :company_id
ORDER BY created_at DESC;
"""

# ---------- 슈퍼관리자 쿼리 ----------
# 특정 기업 ID에 소속된 관리자 목록을 조회하는 쿼리
GET_ADMINS_BY_COMPANY_ID_SQL = """
SELECT
    admin_internal_id,
    company_internal_id,
    email,
    name,
    department,
    job_title,
    is_super,
    is_active,
    created_at,
    updated_at
FROM tb_admin
WHERE company_internal_id = :company_id
"""

# 특정 기업 ID로 기업 정보를 조회하는 순수 SQL 쿼리
GET_COMPANY_BY_ID_SQL = """
SELECT
    c.company_internal_id,
    c.name,
    c.code,
    c.contact,
    c.is_active,
    c.created_at,
    c.updated_at,
    (SELECT COUNT(*) FROM tb_admin a WHERE a.company_internal_id = c.company_internal_id) as admin_count
FROM tb_company c
WHERE c.company_internal_id = :company_id
"""

# 기업 목록과 각 기업별 관리자 수를 함께 조회하는 쿼리
GET_COMPANIES_WITH_ADMIN_COUNT_SQL = """
SELECT
    c.company_internal_id,
    c.name,
    c.code,
    c.contact,
    c.is_active,
    c.created_at,
    c.updated_at,
    (SELECT COUNT(*) FROM tb_admin a WHERE a.company_internal_id = c.company_internal_id) as admin_count
FROM tb_company c
ORDER BY c.created_at DESC
LIMIT :limit OFFSET :skip
"""

# 관리자 상태(is_active)를 업데이트하는 쿼리
UPDATE_ADMIN_STATUS_SQL = """
UPDATE tb_admin
SET is_active = :is_active
WHERE admin_internal_id = :admin_id
"""

# 관리자를 ID로 삭제하는 쿼리
DELETE_ADMIN_BY_ID_SQL = """
DELETE FROM tb_admin
WHERE admin_internal_id = :admin_id
"""

# 관리자 정보(이름, 이메일, 부서, 직책)를 업데이트하는 쿼리
UPDATE_ADMIN_DETAILS_SQL = """
UPDATE tb_admin
SET
    name = COALESCE(:name, name),
    email = COALESCE(:email, email),
    department = COALESCE(:department, department),
    job_title = COALESCE(:job_title, job_title)
WHERE admin_internal_id = :admin_id
"""
