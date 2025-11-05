// src/app/(admin)/products/[id]/page.tsx

import React from 'react';

// [id] 같은 동적 경로(dynamic route)를 위한 기본 페이지 컴포넌트입니다.
export default function AdminProductDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>관리자 상품 상세 페이지</h1>
      <p>상품 ID: {params.id}</p>
      {/* 여기에 실제 페이지 내용을 만드시면 됩니다. */}
    </div>
  );
}