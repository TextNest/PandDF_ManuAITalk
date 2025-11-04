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