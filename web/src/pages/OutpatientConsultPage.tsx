/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 门诊问诊详情页 /outpatient/consult/:encounterId
 * 全屏专注问诊：顶部导航 + 问诊/诊断/处方/检查/病历多 Tab，右侧患者与 AI。
 */
import React, { useEffect } from 'react';
import { Button, Layout, Space, Tabs, Tag, Typography, message } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useOutpatientStore } from '@/store/outpatientStore';
import ConsultationForm from '@/components/outpatient/ConsultationForm';
import DiagnosisPanel from '@/components/outpatient/DiagnosisPanel';
import PrescriptionPanel from '@/components/outpatient/PrescriptionPanel';
import OrderPanel from '@/components/outpatient/OrderPanel';
import MedicalRecordPanel from '@/components/outpatient/MedicalRecordPanel';
import AIAssistant from '@/components/outpatient/AIAssistant';
import PatientSummaryPanel from '@/components/outpatient/PatientSummaryPanel';

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

export const OutpatientConsultPage: React.FC = () => {
  const { encounterId } = useParams<{ encounterId: string }>();
  const navigate = useNavigate();
  const startConsultation = useOutpatientStore((s) => s.startConsultation);
  const syncDoctorFromAuth = useOutpatientStore((s) => s.syncDoctorFromAuth);
  const currentPatient = useOutpatientStore((s) => s.currentPatient);
  const doctor = useOutpatientStore((s) => s.doctor);
  const finishEncounter = useOutpatientStore((s) => s.finishEncounter);

  useEffect(() => {
    syncDoctorFromAuth();
    if (encounterId) void startConsultation(encounterId);
  }, [encounterId, startConsultation, syncDoctorFromAuth]);

  return (
    <Layout className="h-screen">
      <Header
        className="!px-4 flex items-center justify-between"
        style={{ background: '#0A4D8C', color: '#fff', height: 56 }}
      >
        <Space>
          <Button size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate('/outpatient')}>
            返回工作台
          </Button>
          <span className="font-bold">门诊问诊</span>
          {doctor?.deptName && <Tag color="blue-inverse">{doctor.deptName}</Tag>}
          <Text style={{ color: 'rgba(255,255,255,0.85)' }}>诊号 {encounterId}</Text>
        </Space>
        <Button
          size="small"
          type="primary"
          ghost
          icon={<CheckCircleOutlined />}
          disabled={!currentPatient}
          onClick={async () => {
            await finishEncounter();
            message.success('就诊完成');
            navigate('/outpatient');
          }}
        >
          完成就诊
        </Button>
      </Header>

      <Layout>
        <Content className="overflow-auto p-4 bg-ink-bg">
          <Tabs
            defaultActiveKey="consult"
            items={[
              { key: 'consult', label: '问诊记录', children: <ConsultationForm /> },
              { key: 'diagnosis', label: '诊断辅助', children: <DiagnosisPanel /> },
              { key: 'rx', label: '处方开具', children: <PrescriptionPanel /> },
              { key: 'order', label: '检查检验', children: <OrderPanel /> },
              { key: 'record', label: '病历书写', children: <MedicalRecordPanel /> },
            ]}
          />
        </Content>
        <Sider
          width={360}
          theme="light"
          className="!bg-ink-bg border-l border-ink-border overflow-auto"
        >
          <div className="p-2 space-y-2">
            <PatientSummaryPanel />
            <AIAssistant />
          </div>
        </Sider>
      </Layout>
    </Layout>
  );
};

export default OutpatientConsultPage;
