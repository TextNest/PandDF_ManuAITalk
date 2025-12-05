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
    product.product_id as productId,
    session.last_message as lastMessage,
    session.message_count as messageCount,
    session.updated_at as updatedAt,
    product.product_name as productName,
    session.created_at as createdAt
FROM
    tb_session as session join tb_product as product on session.product_internal_id = product.product_internal_id
WHERE
    user_internal_id = :user_internal_id
ORDER BY
    session.updated_at DESC
"""

add_session ="""
INSERT INTO tb_session (user_internal_id,product_internal_id,session_id) 
VALUES(:user_internal_id,
(SELECT product_internal_id FROM tb_product WHERE product_id = :productId),
:session_id)"""

find_message = """
SELECT message_internal_id as id,role,content,created_at as timestamp,feedback
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
DELETE FROM tb_session WHERE user_internal_id = :user_internal_id AND session_id = :session_id
"""


delete_message = """
DELETE FROM test_message WHERE session_internal_id = (SELECT session_internal_id FROM tb_session WHERE session_id = :session_id)
"""

find_answer = """
SELECT answer FROM tb_faq WHERE question = :last_msg AND 
product_internal_id = (SELECT product_internal_id FROM tb_product WHERE product_id = :product_id) """

find_questions = """
SELECT question FROM tb_faq WHERE product_internal_id = (SELECT product_internal_id FROM tb_product WHERE product_id = :productId) AND faq_status = 'active' ORDER BY RAND() Limit 4
"""

origin_query = """
SELECT product_id,product_name FROM tb_product WHERE category = (SELECT category FROM tb_product WhERE product_id = :product_id) and product_id != :product_id """

# ---------- report ----------

class AutoReportProcess_v2:
    find_session_for_rep = """
    SELECT MSG.session_internal_id
    FROM tb_message MSG
    WHERE NOT EXISTS (SELECT 1 FROM tb_report RP WHERE RP.session_internal_id = MSG.session_internal_id)
    GROUP BY MSG.session_internal_id
    HAVING MAX(MSG.created_at) < NOW() - INTERVAL 30 MINUTE
    ORDER BY MAX(MSG.created_at) ASC
    LIMIT 200
    """

    find_message_for_rep = """
    SELECT role, content, feedback, created_at
    FROM tb_message
    WHERE session_internal_id = :sid
    ORDER BY created_at ASC
    """

    find_product_for_rep = """
    SELECT TS.session_id, TP.product_name, TP.product_id, TP.category
    FROM tb_session TS
    LEFT JOIN tb_product TP
    ON TS.product_internal_id = TP.product_internal_id
    WHERE TS.session_internal_id = :sid
    """

    reset_all_rep = """
    TRUNCATE TABLE tb_report
    """

    report_query = """
    INSERT INTO tb_report (
        session_internal_id,
        session_id,
        product_name,
        product_id,
        category,
        is_resolved,
        content,
        started_at,
        completed_at,
        positive,
        negative,
        satisfaction
    ) VALUES (
        :sid,
        :session,
        :product_name,
        :pid,
        :ctg,
        :stat,
        :summary,
        :started_at,
        :ended_at,
        :pos,
        :neg,
        :satisfy
    )
    ON DUPLICATE KEY UPDATE
        session_id = VALUES(session_id),
        product_name = VALUES(product_name),
        product_id = VALUES(product_id),
        category = VALUES(category),
        is_resolved = VALUES(is_resolved),
        content = VALUES(content),
        started_at = VALUES(started_at),
        completed_at = VALUES(completed_at),
        positive = VALUES(positive),
        negative = VALUES(negative),
        satisfaction = VALUES(satisfaction)
    """

class LogQuery_v2:
    view_recent = """
    SELECT
        RP.session_internal_id as sid,
        RP.is_resolved as status,
        RP.product_id as productId,
        DATE_FORMAT(RP.completed_at, '%Y-%m-%d %H:%i:%s') as endedAt,
        (
            SELECT TM.content
            FROM tb_message AS TM
            WHERE TM.session_internal_id = RP.session_internal_id
            ORDER BY TM.message_internal_id ASC
            LIMIT 1
        ) AS message
    FROM tb_report AS RP
    ORDER BY RP.completed_at DESC
    LIMIT 3
    """
    
    product_info = """
    SELECT
        category,
        product_id AS productId
    FROM tb_product
    ORDER BY category, product_id
    """

    view_session_head = """
    SELECT
        RP.session_internal_id AS sid,
        RP.session_id AS sessionId,
        RP.is_resolved AS status,
        RP.product_id AS productId,
        RP.satisfaction,
        DATE_FORMAT(RP.completed_at, '%Y-%m-%d %H:%i:%s') as endedAt,
        (
            SELECT TM.content
            FROM tb_message AS TM
            WHERE TM.session_internal_id = RP.session_internal_id
            ORDER BY TM.created_at ASC, TM.message_internal_id ASC
            LIMIT 1
        ) AS message
    FROM tb_report AS RP
    """

    view_session_tail = """
    ORDER BY RP.report_internal_id DESC
    LIMIT :limit OFFSET :offset
    """

    view_report = """
    SELECT
        session_id   AS sessionId,
        product_name AS productName,
        product_id   AS productId,
        category,
        is_resolved  AS status,
        content      AS summary,
        DATE_FORMAT(started_at, '%Y-%m-%d %H:%i:%s')   AS startedAt,
        DATE_FORMAT(completed_at, '%Y-%m-%d %H:%i:%s') AS endedAt,
        positive,
        negative,
        satisfaction
    FROM tb_report
    WHERE session_internal_id = :sid
    """

    view_log = """
    SELECT
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s')       AS createdAt,
        MAX(CASE WHEN role = 'user' THEN content END)      AS userMessage,
        MAX(CASE WHEN role = 'assistant' THEN content END) AS botMessage,
        MAX(feedback)                                      AS feedback
    FROM tb_message
    WHERE session_internal_id = :sid
    GROUP BY created_at
    ORDER BY created_at ASC
    """

# ---------- FAQ 관련 쿼리 ----------
# 목록 조회 (필터링 가능)
find_faq = """
SELECT
    f.faq_internal_id,
    HEX(faq_id) as faq_id,
    f.question,
    f.answer,
    f.tags,
    p.category,
    p.product_internal_id,
    p.product_id,
    p.product_name,
    f.faq_status,
    f.is_autogenerated,
    f.source,
    f.created_by,
    f.created_at,
    f.updated_by,
    f.updated_at
FROM
    tb_faq f
    LEFT JOIN tb_product p
    ON f.product_internal_id = p.product_internal_id
WHERE 
    f.company_internal_id = :company_internal_id   
"""

# 질문 목록 조회(faq_id)
find_faq_by_id = """
SELECT
    f.faq_internal_id,
    HEX(faq_id) as faq_id,
    f.question,
    f.answer,
    f.tags,
    p.product_internal_id,
    p.product_id,
    p.product_name,
    p.category,
    f.faq_status,
    f.is_autogenerated,
    f.source,
    f.created_by,
    f.created_at,
    f.updated_by,
    f.updated_at
FROM
    tb_faq f
    LEFT JOIN tb_product p
    ON f.product_internal_id = p.product_internal_id
WHERE
    faq_id = UNHEX(:faq_id)
"""

# 질문 목록 조회(product_id)
find_faq_questions_by_product = """
SELECT 
    f.question
FROM
    tb_faq f
    LEFT JOIN tb_product p
    ON f.product_internal_id = p.product_internal_id
WHERE
    p.product_id = :product_id
"""

# 생성
create_faq = """
INSERT INTO tb_faq (
    faq_id, question, answer, company_internal_id, product_internal_id, tags,
    faq_status, is_autogenerated, source, created_by
) VALUES (
    :faq_id, :question, :answer, :company_internal_id, :product_internal_id, :tags,
    :faq_status, :is_autogenerated, :source, :created_by
)
"""

# 수정
update_faq = """
UPDATE tb_faq
SET 
    question = COALESCE(:question, question),
    answer = COALESCE(:answer, answer),
    product_internal_id = COALESCE(:product_internal_id, product_internal_id),
    tags = COALESCE(:tags, tags),
    faq_status = COALESCE(:faq_status, faq_status),
    updated_by = :updated_by
WHERE faq_id = UNHEX(:faq_id);
"""

# 삭제
delete_faq = """
DELETE FROM tb_faq
WHERE faq_id = UNHEX(:faq_id);
"""

# 자동 생성 시 사용할 메시지 고르기
find_faq_messages = """
SELECT 
    m.role,
    m.content,
    s.session_id,
    p.company_internal_id,
    p.product_internal_id,
    p.product_id,
    p.product_name,
    p.category,
    m.created_at,
    m.tool_name
FROM tb_message m
    JOIN tb_session s
    ON m.session_internal_id = s.session_internal_id
    JOIN tb_product p 
    ON s.product_internal_id = p.product_internal_id
WHERE 
    m.created_at >= :start_date
    -- 파이썬 로직으로 회사 ID 필터링 조건이 추가되는 곳
ORDER BY
    m.message_internal_id ASC
;
"""

# 자동 생성 로그 생성
create_faq_generation_log = """
INSERT INTO tb_faq_generation_log (
    generation_id, status, messages_analyzed,
    messages_extracted, faq_created, created_by, is_scheduled
) VALUES (
    :generation_id, :status, :messages_analyzed,
    :messages_extracted, :faq_created, :created_by, :is_scheduled
);
"""

# 자동 생성 로그 업데이트
update_faq_generation_log = """
UPDATE tb_faq_generation_log
SET 
    completed_at = :completed_at,
    status = :status,
    messages_analyzed = COALESCE(:messages_analyzed, messages_analyzed),
    messages_extracted = COALESCE(:messages_extracted, messages_extracted),
    faq_created = COALESCE(:faq_created, faq_created),
    error_message = :error_message
WHERE generation_id = :generation_id;
"""

# ---------- 제품관리, AR 관련 쿼리 ----------
# 전체 제품 조회 (회사명 포함)
find_all_product = """
SELECT p.*, c.name as company_name
FROM tb_product p
LEFT JOIN tb_company c ON p.company_internal_id = c.company_internal_id
WHERE p.is_active = 1
ORDER BY p.created_at DESC;
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

# ---------- 대시보드 관련 ----------
total_companies = "SELECT COUNT(*) FROM tb_company"
total_users = "SELECT COUNT(*) FROM tb_admin"
total_documents = "SELECT COUNT(*) FROM tb_product"
total_questions = "SELECT COUNT(*) FROM tb_message WHERE role='user'"

recent_company = """
    SELECT 'company' as type, name as content, created_at 
    FROM tb_company 
    ORDER BY created_at DESC LIMIT 5
    """

get_total_documents_sql = """
SELECT COUNT(*) 
FROM tb_product 
WHERE company_internal_id = :company_id
"""

get_total_faqs_sql = """
SELECT COUNT(*) 
FROM tb_faq 
WHERE company_internal_id = :company_id 
  AND is_autogenerated = 1
"""

get_total_questions_sql = """
SELECT COUNT(*) 
FROM tb_message m
JOIN tb_session s ON m.session_internal_id = s.session_internal_id
JOIN tb_product p ON s.product_internal_id = p.product_internal_id
WHERE p.company_internal_id = :company_id 
  AND m.role = 'user'
"""

get_avg_questions_per_session_sql = """
SELECT 
    COUNT(CASE WHEN m.role = 'user' THEN 1 END) AS total_questions,
    COUNT(DISTINCT s.session_internal_id) AS total_sessions
FROM tb_session s
JOIN tb_product p ON s.product_internal_id = p.product_internal_id
LEFT JOIN tb_message m ON s.session_internal_id = m.session_internal_id
WHERE p.company_internal_id = :company_id
"""

get_recent_activity_sql = """
SELECT 
    'query' AS type, 
    LEFT(m.content, 50) AS content, 
    m.created_at 
FROM tb_message m
JOIN tb_session s ON m.session_internal_id = s.session_internal_id
JOIN tb_product p ON s.product_internal_id = p.product_internal_id
WHERE p.company_internal_id = :company_id 
  AND m.role = 'user'
ORDER BY m.created_at DESC 
LIMIT 5
"""

get_top_products_sql = """
SELECT p.product_name, p.product_id, COUNT(*) AS count
FROM tb_session s
JOIN tb_product p ON s.product_internal_id = p.product_internal_id
WHERE p.company_internal_id = :company_id
GROUP BY p.product_internal_id, p.product_name, p.product_id
ORDER BY count DESC
LIMIT 5
"""

get_daily_queries_sql = """
SELECT DATE_FORMAT(m.created_at, '%Y-%m-%d') AS date, COUNT(*) AS count
FROM tb_message m
JOIN tb_session s ON m.session_internal_id = s.session_internal_id
JOIN tb_product p ON s.product_internal_id = p.product_internal_id
WHERE p.company_internal_id = :company_id
  AND m.role = 'user'
  AND m.created_at >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
GROUP BY DATE_FORMAT(m.created_at, '%Y-%m-%d')
ORDER BY date ASC
"""
