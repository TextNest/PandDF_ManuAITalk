// app/superadmin/companies/[company_id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, Edit, ToggleRight, Trash2 } from 'lucide-react'; // Edit 아이콘 추가
import styles from './company-detail.module.css';
import Button from '@/components/ui/Button/Button';
import apiClient from '@/lib/api/client';
import AdminEditModal from '@/components/superadmin/AdminEditModal'; // 모달 컴포넌트 import
import { toast } from '@/store/useToastStore';
interface Company {
  name: string;
}
interface Admin {
  admin_internal_id: number;
  name: string;
  email: string;
  department: string | null;
  job_title: string | null;
  is_active: 0 | 1;
  created_at: string;
}

export default function CompanyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.company_id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAdminIds, setSelectedAdminIds] = useState<number[]>([]); // 선택된 관리자 ID 목록 상태
  
  // 수정 모달 관련 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);

  useEffect(() => {
    if (!companyId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const authStorage = localStorage.getItem('auth-storage');
        const token = authStorage ? JSON.parse(authStorage).state.token : null;
        if (!token) {
          throw new Error('인증 토큰이 필요합니다.');
        }

        const [companyRes, adminsRes] = await Promise.all([
          apiClient.get(`/api/superadmin/companies/${companyId}`),
          apiClient.get(`/api/superadmin/companies/${companyId}/admins`)
        ]);

        if (companyRes.status !== 200) throw new Error(`기업 정보 로딩 실패 (상태: ${companyRes.status})`);
        if (adminsRes.status !== 200) throw new Error(`관리자 목록 로딩 실패 (상태: ${adminsRes.status})`);

        setCompany(companyRes.data);
        setAdmins(adminsRes.data);

      } catch (err) {
        setError(err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [companyId]);
  
  const handleSelectAdmin = (adminId: number) => {
    setSelectedAdminIds(prev =>
      prev.includes(adminId)
        ? prev.filter(id => id !== adminId)
        : [...prev, adminId]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedAdminIds(admins.map(admin => admin.admin_internal_id));
    } else {
      setSelectedAdminIds([]);
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedAdminIds.length === 0) {
      toast.warning('먼저 관리자를 선택해주세요.');
      return;
    }

    const confirmText = {
      activate: `선택한 ${selectedAdminIds.length}명의 관리자를 활성화하시겠습니까?`,
      deactivate: `선택한 ${selectedAdminIds.length}명의 관리자를 비활성화하시겠습니까?`,
      delete: `선택한 ${selectedAdminIds.length}명의 관리자를 삭제하시겠습니까?`,
    };

    if (confirm(confirmText[action])) {
      const originalAdmins = [...admins]; // 롤백을 위한 원본 데이터 저장

      // Optimistic UI Update
      if (action === 'activate' || action === 'deactivate') {
        const newStatus = action === 'activate' ? 1 : 0;
        setAdmins(prevAdmins =>
          prevAdmins.map(admin =>
            selectedAdminIds.includes(admin.admin_internal_id)
              ? { ...admin, is_active: newStatus }
              : admin
          )
        );
      } else if (action === 'delete') {
        setAdmins(prevAdmins =>
          prevAdmins.filter(admin => !selectedAdminIds.includes(admin.admin_internal_id))
        );
      }

      try {
        if (action === 'activate' || action === 'deactivate') {
          await apiClient.put('/api/superadmin/admins/status', {
            admin_ids: selectedAdminIds,
            is_active: action === 'activate' ? 1 : 0,
          });
        } else if (action === 'delete') {
          await apiClient.delete('/api/superadmin/admins', {
            data: { admin_ids: selectedAdminIds },
          });
        }
        toast.success('선택한 항목에 대한 작업이 완료되었습니다.');
      } catch (err) {
        setAdmins(originalAdmins); // 오류 발생 시 UI 롤백
        const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        toast.error(`작업 실패: ${message}`);
        setError(message);
      } finally {
        setSelectedAdminIds([]); // 작업 후 선택 해제
      }
    }
  };


  const handleOpenEditModal = () => {
    if (selectedAdminIds.length !== 1) {
      toast.warning('수정할 관리자 한 명을 선택해주세요.');
      return;
    }
    const adminToEdit = admins.find(admin => admin.admin_internal_id === selectedAdminIds[0]);
    if (adminToEdit) {
      setEditingAdmin(adminToEdit);
      setIsEditModalOpen(true);
    }
  };

  const handleSaveAdmin = async (adminId: number, data: any) => {
    const originalAdmins = [...admins];
    // Optimistic UI Update
    setAdmins(prevAdmins =>
      prevAdmins.map(admin =>
        admin.admin_internal_id === adminId ? { ...admin, ...data } : admin
      )
    );
    setIsEditModalOpen(false); // 모달 닫기
    
    try {
      const response = await apiClient.put(`/api/superadmin/admins/${adminId}`, data);
      // API 응답으로 실제 데이터 다시 업데이트
      setAdmins(prevAdmins =>
        prevAdmins.map(admin =>
          admin.admin_internal_id === adminId ? response.data : admin
        )
      );
      toast.success('관리자 정보가 성공적으로 수정되었습니다.');
    } catch (err) {
      setAdmins(originalAdmins); // 오류 시 롤백
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      toast.error(`수정 실패: ${message}`);
    } finally {
        setSelectedAdminIds([]); // 선택 해제
    }
  };

  if (loading) return <div className={styles.loading}>데이터를 불러오는 중...</div>;
  if (error) return <div className={styles.error}>오류: {error}</div>;

  const isAllSelected = selectedAdminIds.length > 0 && selectedAdminIds.length === admins.length;

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft size={16} />
          돌아가기
        </Button>
        <div className={styles.titleGroup}>
          <h1>{company?.name}</h1>
          <p>소속 관리자 목록</p>
        </div>
        <Button variant="primary">
          <UserPlus size={16} />
          관리자 추가
        </Button>
      </div>
      
      {/* --- 상단 액션 버튼 그룹 --- */}
      <div className={styles.bulkActions}>
        <span className={styles.selectionCount}>
          {selectedAdminIds.length}개 선택됨
        </span>
        <div className={styles.actionButtons}>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={handleOpenEditModal} 
                        disabled={selectedAdminIds.length !== 1}
                        className={styles.editButton} // 새로운 클래스 추가
                      >
                        <Edit size={16} />
                        수정
                      </Button>          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => handleBulkAction('activate')} 
            disabled={selectedAdminIds.length === 0}
          >
            활성화
          </Button>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => handleBulkAction('deactivate')} 
            disabled={selectedAdminIds.length === 0}
          >
            비활성화
          </Button>
          <Button 
            size="sm" 
            variant="danger"
            onClick={() => handleBulkAction('delete')} 
            disabled={selectedAdminIds.length === 0}
          >
            삭제
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  <input 
                    type="checkbox" 
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>이름</th>
                <th>이메일</th>
                <th>부서</th>
                <th>직책</th>
                <th>상태</th>
                <th>등록일</th>
              </tr>
            </thead>
            <tbody>
              {admins.length > 0 ? (
                admins.map(admin => (
                  <tr key={admin.admin_internal_id}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedAdminIds.includes(admin.admin_internal_id)}
                        onChange={() => handleSelectAdmin(admin.admin_internal_id)}
                      />
                    </td>
                    <td>{admin.name}</td>
                    <td>{admin.email}</td>
                    <td>{admin.department || '-'}</td>
                    <td>{admin.job_title || '-'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${admin.is_active === 1 ? styles.active : styles.inactive}`}>
                        {admin.is_active === 1 ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td>{new Date(admin.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={styles.noData}>소속된 관리자가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <AdminEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingAdmin(null);
          setSelectedAdminIds([]); // 모달 닫을 때 선택 해제
        }}
        admin={editingAdmin}
        onSave={handleSaveAdmin}
      />
    </>
  );
}
