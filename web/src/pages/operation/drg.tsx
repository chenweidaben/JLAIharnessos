/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * DRG/DIP 分析页
 */
import { usePageTitle } from '@/hooks';
import DRGDAnalysis from '@/components/operation/DRGDAnalysis';

export default function OperationDrgPage() {
  usePageTitle('DRG/DIP 分析');
  return <DRGDAnalysis />;
}
