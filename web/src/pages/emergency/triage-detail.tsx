/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 分诊详情页（/emergency/triage/:visitId）：四级分诊工作台
 */
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Result, Spin } from 'antd';

import { PageContainer } from '@/components/common';
import { TriageLevel } from '@/components/emergency';
import { useEmergencyStore } from '@/store/emergencyStore';

export default function TriageDetailPage() {
  const { visitId = '' } = useParams<{ visitId: string }>();
  const navigate = useNavigate();
  const { queue, loadingQueue, fetchQueue } = useEmergencyStore();

  useEffect(() => {
    void fetchQueue();
  }, [fetchQueue]);

  const item = useMemo(() => queue.find((q) => q.visitId === visitId), [queue, visitId]);

  if (!item) {
    return (
      <div className="flex h-64 items-center justify-center">
        {loadingQueue ? (
          <Spin size="large" tip="加载分诊信息…" />
        ) : (
          <Card>
            <Result
              status="404"
              title="未找到该就诊"
              subTitle="该就诊可能已完成、已离院，或不在你的数据权限范围内"
              extra={
                <Button type="primary" onClick={() => navigate('/emergency')}>
                  返回分诊台
                </Button>
              }
            />
          </Card>
        )}
      </div>
    );
  }

  return (
    <PageContainer
      title="四级分诊"
      description={`分诊号 ${item.triageNo} · ${item.patientName} · ${item.chiefComplaint ?? ''}`}
    >
      <TriageLevel item={item} />
    </PageContainer>
  );
}
