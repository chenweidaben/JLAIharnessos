/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 门诊工作台主页面：左候诊队列 + 中间问诊区 + 右患者360/AI 辅助。
 * 顶部展示科室、医生、号源、叫号状态。
 */
import React, { useEffect } from 'react';
import { Badge, Button, Layout, Space, Tabs, Tag, Typography, message } from 'antd';
import {
  AudioOutlined,
  CheckCircleOutlined,
  LogoutOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useOutpatientStore } from '@/store/outpatientStore';
import WaitingQueue from '@/components/outpatient/WaitingQueue';
import ConsultationForm from '@/components/outpatient/ConsultationForm';
import DiagnosisPanel from '@/components/outpatient/DiagnosisPanel';
import PrescriptionPanel from '@/components/outpatient/PrescriptionPanel';
import OrderPanel from '@/components/outpatient/OrderPanel';
import MedicalRecordPanel from '@/components/outpatient/MedicalRecordPanel';
import AIAssistant from '@/components/outpatient/AIAssistant';
import ReferralPanel from '@/components/outpatient/ReferralPanel';
import OutpatientStats from '@/components/outpatient/OutpatientStats';
import PatientSummaryPanel from '@/components/outpatient/PatientSummaryPanel';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MIDDLE_TABS = [
  { key: 'consult', label: '问诊记录' },
  { key: 'diagnosis', label: '诊断辅助' },
  { key: 'prescription', label: '处方开具' },
  { key: 'order', label: '检查检验' },
  { key: 'record', label: '病历书写' },
  { key: 'referral', label: '转诊会诊' },
];

export const OutpatientPage: React.FC = () => {
  const navigate = useNavigate();
  const doctor = useOutpatientStore((s) => s.doctor);
  const fetchWaitingQueue = useOutpatientStore((s) => s.fetchWaitingQueue);
  const currentPatient = useOutpatientStore((s) => s.currentPatient);
  const currentEncounterId = useOutpatientStore((s) => s.currentEncounterId);
  const startConsultation = useOutpatientStore((s) => s.startConsultation);
  const finishConsultation = useOutpatientStore((s) => s.finishConsultation);
  const activeTab = useOutpatientStore((s) => s.activeTab);
  const setActiveTab = useOutpatientStore((s) => s.setActiveTab);

  useEffect(() => {
    void fetchWaitingQueue();
  }, [fetchWaitingQueue]);

  const handleSelect = (encounterId: string) => {
    startConsultation(encounterId);
    setActiveTab('consult');
  };

  return (
    <Layout className="h-screen">
      {/* 顶部栏 */}
      <Header
        className="!px-4 flex items-center justify-between"
        style={{ background: '#0A4D8C', color: '#fff', height: 56, lineHeight: '56px' }}
      >
        <Space size="large">
          <span className="font-bold text-base">健澜科技数智医院智能体 · 门诊工作台</span>
          <Tag color="blue-inverse">{doctor.deptName}</Tag>
          <span>{doctor.room}</span>
        </Space>
        <Space size="middle">
          <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
            {doctor.doctorName} · {doctor.title}
          </Text>
          <Badge count={`${doctor.calledQuota}/${doctor.todayQuota}`} overflowCount={9999}>
            <Tag color="cyan-inverse">今日号源</Tag>
          </Badge>
          <Button
            size="small"
            icon={<AudioOutlined />}
            onClick={() => {
              useOutpatientStore.getState().callNext();
              message.success('已叫下一位');
            }}
          >
            叫号
          </Button>
          <Button
            size="small"
            icon={<CheckCircleOutlined />}
            disabled={!currentEncounterId}
            onClick={() => {
              finishConsultation();
              message.success('本次就诊完成，已自动叫下一位');
            }}
          >
            完成就诊
          </Button>
          <Button size="small" icon={<LogoutOutlined />} onClick={() => navigate('/')}>
            退出
          </Button>
        </Space>
      </Header>

      <Layout>
        {/* 左：候诊队列 */}
        <Sider
          width={320}
          theme="light"
          className="!bg-ink-bg border-r border-ink-border overflow-auto"
        >
          <div className="p-2 space-y-2">
            <WaitingQueue onSelect={handleSelect} />
            <OutpatientStats />
          </div>
        </Sider>

        {/* 中：问诊区 */}
        <Content className="overflow-auto p-3 bg-ink-bg">
          {!currentPatient ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <RobotOutlined style={{ fontSize: 48, color: '#0A4D8C' }} />
                <div className="mt-3 text-ink-secondary">
                  请从左侧候诊队列选择患者，或点击"呼叫下一位"
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Space>
                  <span className="font-semibold">当前就诊：{currentPatient.nameMasked}</span>
                  <Tag color="processing">就诊中</Tag>
                </Space>
                <Text type="secondary" className="text-xs">
                  诊号 {currentEncounterId}
                </Text>
              </div>
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={MIDDLE_TABS.map((t) => ({ key: t.key, label: t.label }))}
              />
              <div className="bg-white rounded p-3">
                {activeTab === 'consult' && <ConsultationForm />}
                {activeTab === 'diagnosis' && <DiagnosisPanel />}
                {activeTab === 'prescription' && <PrescriptionPanel />}
                {activeTab === 'order' && <OrderPanel />}
                {activeTab === 'record' && <MedicalRecordPanel />}
                {activeTab === 'referral' && <ReferralPanel />}
              </div>
            </div>
          )}
        </Content>

        {/* 右：患者360 + AI */}
        <Sider
          width={340}
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

export default OutpatientPage;
