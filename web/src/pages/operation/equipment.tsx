/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 设备与物资管理页
 */
import { usePageTitle } from '@/hooks';
import EquipmentManagement from '@/components/operation/EquipmentManagement';

export default function OperationEquipmentPage() {
  usePageTitle('设备物资管理');
  return <EquipmentManagement />;
}
