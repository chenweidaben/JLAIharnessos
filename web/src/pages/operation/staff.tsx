/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 人员管理页
 */
import { usePageTitle } from '@/hooks';
import StaffManagement from '@/components/operation/StaffManagement';

export default function OperationStaffPage() {
  usePageTitle('人员管理');
  return <StaffManagement />;
}
