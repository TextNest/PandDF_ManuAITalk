// /lib/db.ts
// 이 파일은 데이터베이스 연결을 설정하고 관리합니다.
// mysql2/promise 라이브러리를 사용하여 연결 풀(Connection Pool)을 생성합니다.

import mysql from 'mysql2/promise';

// .env.local 파일에 데이터베이스 연결 정보가 있는지 확인합니다.
// 필수 환경 변수가 없으면 애플리케이션 시작 시 오류를 발생시켜 설정을 강제합니다.
if (!process.env.DB_HOST || !process.env.DB_PORT || !process.env.DB_USER) {
    throw new Error("DB 연결 정보가 .env.local 파일에 설정되지 않았습니다.");
}

// 데이터베이스 연결 풀을 생성합니다.
// createConnection 대신 createPool을 사용하면, 여러 요청이 동시에 들어왔을 때
// 연결을 재사용하거나 관리하여 성능을 향상시킬 수 있습니다.
const pool = mysql.createPool({
    host: process.env.DB_HOST,         // DB 호스트 주소
    user: process.env.DB_USER,         // DB 사용자 이름
    password: process.env.DB_PASSWORD, // DB 비밀번호
    database: process.env.DB_NAME,     // 사용할 데이터베이스 이름
    port: parseInt(process.env.DB_PORT || '3306'), // DB 포트 번호

});

// 생성된 연결 풀을 다른 파일에서 import하여 사용할 수 있도록 export합니다.
export default pool;
