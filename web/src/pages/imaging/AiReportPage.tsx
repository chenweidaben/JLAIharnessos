/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * DAMO-RADAR「AI 辅诊报告」独立页：/imaging/ai/report/:studyUid?
 * 复用 ImagingAiReport 组合组件；查看权限 imaging:view（路由层 RequirePermission）。
 */
import { useParams } from 'react-router-dom';

import { PageContainer } from '@/components/common';
import { ImagingAiReport } from '@/components/imagingAi';
import { usePageTitle } from '@/hooks';

export default function ImagingAiReportPage() {
  const { studyUid } = useParams<{ studyUid?: string }>();
  usePageTitle('AI 辅诊报告');

  return (
    <PageContainer title="AI 辅诊报告（DAMO-RADAR）">
      <ImagingAiReport studyUid={studyUid} />
    </PageContainer>
  );
}
