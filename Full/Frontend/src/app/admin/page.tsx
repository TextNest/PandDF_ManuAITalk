// src/app/admin/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';


export default function AdminPage() {
  const router = useRouter();
  const {isAuthenticated,isSuperAdmin,isCompanyAdmin} = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/admin/login');
    }
    else {
        if (!isCompanyAdmin()){
            if (!isSuperAdmin()){
                alert('접근 권한이 없습니다. 관리자만 접근할 수 있습니다. 메인페이지로 이동하겠습니다.');
                router.push('/')
            }
            else{
                router.push('/superadmin')
            }   
        }
        else{
            router.push('/dashboard')  
        }
      
    }
  }, [isAuthenticated, router,isCompanyAdmin,isSuperAdmin]);
  return null;}