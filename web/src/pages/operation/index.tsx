/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 科室运营概览页
 */
import { usePageTitle } from '@/hooks';
import DepartmentOverview from '@/components/operation/DepartmentOverview';

export default function OperationOverviewPage() {
  usePageTitle('科室运营概览');
  return <DepartmentOverview />;
}
