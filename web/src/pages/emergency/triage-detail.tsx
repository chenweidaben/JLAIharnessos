/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 分诊详情页（/emergency/triage/:patientId）：四级分诊工作台
 */
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, Result, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';

import { PageContainer } from '@/components/common';
import { TriageLevel } from '@/components/emergency';
import { useEmergencyStore } from '@/store/emergencyStore';

export default function TriageDetailPage() {
  const { patientId = '' } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { currentPatient, startTriage, loading } = useEmergencyStore();

  useEffect(() => {
    void startTriage(patientId);
  }, [patientId, startTriage]);

  if (loading && !currentPatient) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载分诊信息…" />
      </div>
    );
  }

  if (!currentPatient) {
    return (
      <Card>
        <Result
          status="404"
          title="未找到患者"
          subTitle="该患者可能已离院或分诊信息不存在"
          extra={
            <Button type="primary" onClick={() => navigate('/emergency')}>
              返回分诊台
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <PageContainer
      title="四级分诊"
      description={`患者 ${currentPatient.name} · ${currentPatient.chiefComplaint}`}
    >
      <TriageLevel patient={currentPatient} />
    </PageContainer>
  );
}
