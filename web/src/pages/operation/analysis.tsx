/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 运营分析页
 */
import { usePageTitle } from '@/hooks';
import OperationAnalysis from '@/components/operation/OperationAnalysis';

export default function OperationAnalysisPage() {
  usePageTitle('运营分析');
  return <OperationAnalysis />;
}
