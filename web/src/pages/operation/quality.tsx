/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 医疗质量指标页
 */
import { usePageTitle } from '@/hooks';
import QualityIndicators from '@/components/operation/QualityIndicators';

export default function OperationQualityPage() {
  usePageTitle('医疗质量指标');
  return <QualityIndicators />;
}
