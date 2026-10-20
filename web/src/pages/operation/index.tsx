/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 科室运营概览页
 *
 * v5.0试点扩展（M184空壳崩溃修复）：本页经 useOperationStore 播种 mock 数据，
 * 运行时即渲染科室信息 + 核心指标统计卡 + 床位/排名表格，非空壳。
 */
import { usePageTitle } from '@/hooks';
import DepartmentOverview from '@/components/operation/DepartmentOverview';

export default function OperationOverviewPage() {
  usePageTitle('科室运营概览');
  return <DepartmentOverview />;
}
