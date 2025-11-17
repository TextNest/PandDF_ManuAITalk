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
SELECT role, content, timestamp
FROM test_message
WHERE session_id = :sid
ORDER BY `timestamp` ASC;
"""

find_product_for_rep = """
SELECT productId as product_id
FROM test_session
WHERE session_id = :sid;
"""

report_query = """
INSERT INTO test_report (
    session_id, product_id, status, content, timestamp_s, timestamp_e
) VALUES (
    :sid, :pid, :stat, :sum, :ts, :te
)
ON DUPLICATE KEY UPDATE
    product_id = VALUES(product_id),
    status = VALUES(status),
    content = VALUES(content),
    timestamp_s = VALUES(timestamp_s),
    timestamp_e = VALUES(timestamp_e);
"""