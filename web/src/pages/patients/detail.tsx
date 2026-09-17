/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 患者360视图：基本信息 + 生命体征 + 趋势 + 告警
 */
import { useEffect, useState } from 'react';
import { Button, Col, Row, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';

import { PageContainer } from '@/components/common';
import { PatientInfoCard, VitalSignsPanel, AlertBanner } from '@/components/medical';
import { LineChart } from '@/components/charts';
import { usePageTitle } from '@/hooks';
import { fetchPatient360, fetchAlerts } from '@/services/api/patient';
import { usePatientStore } from '@/store/patientStore';
import type { Alert } from '@/types/medical';

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  usePageTitle('患者详情');

  const { patient360, setPatient360, currentPatient } = usePatientStore();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    if (!id) return;
    fetchPatient360(id).then(setPatient360);
    fetchAlerts().then((list) =>
      setAlerts(list.filter((a) => a.patientId === id && !a.acknowledged)),
    );
  }, [id, setPatient360]);

  if (!patient360 || !currentPatient) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const latest = patient360.vitalSigns[patient360.vitalSigns.length - 1];
  const chartX = patient360.vitalSigns.map((v) => new Date(v.measureTime).getHours() + ':00');
  const hrData = patient360.vitalSigns.map((v) => v.heartRate ?? 0);
  const bpData = patient360.vitalSigns.map((v) => v.systolic ?? 0);

  return (
    <PageContainer
      title="患者360视图"
      description={currentPatient.diagnosis}
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/patients')}>
          返回列表
        </Button>
      }
    >
      {alerts.map((a) => (
        <AlertBanner key={a.id} alert={a} />
      ))}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <PatientInfoCard patient={currentPatient} />
        </Col>
        <Col xs={24} lg={14}>
          <VitalSignsPanel data={latest} />
        </Col>
      </Row>

      <div className="jl-card mt-4 p-4">
        <h3 className="m-0 mb-2 text-base font-medium">生命体征趋势（24h）</h3>
        <LineChart
          xData={chartX}
          series={[
            { name: '心率', data: hrData },
            { name: '收缩压', data: bpData },
          ]}
          height={280}
        />
      </div>
    </PageContainer>
  );
}
