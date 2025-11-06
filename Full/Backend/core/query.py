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
SELECT id,role,content,timestamp
FROM test_message
WHERE session_id = :session_id AND email = :user_id
ORDER BY timestamp ASC
"""
find_session ="""
SELECT id FROM test_session WHERE email = :email AND session_id = :session_id"""
add_message ="""
INSERT INTO test_message (email,session_id,role,content) VALUES (:email,:session_id,:role,:content)
"""
add_session ="""
INSERT INTO test_session (email,productId,session_id,lastMessage,messageCount) VALUES(:email,:productId,:session_id,:lastMessage,:messageCount)"""

update_session ="""
UPDATE test_session SET lastMessage = :lastMessage, messageCount = :messageCount , updatedAt = CURRENT_TIMESTAMP
WHERE email = :email AND session_id = :session_id"""