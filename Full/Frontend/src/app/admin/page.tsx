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