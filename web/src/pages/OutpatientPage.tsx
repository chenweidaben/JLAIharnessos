/**
 * 健澜科技 jlmedaios - 门诊工作台主页面
 *
 * 布局：左候诊队列 + 统计；中问诊/诊断/处方/检查/病历/转诊；右患者 360 + AI 助手。
 * 真实模式直连 BFF；连不上后端时顶部明确报错，不静默使用假数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import React, { useEffect } from 'react';
import {
  Alert,
  Button,
  Layout,
  Space,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import {
  AudioOutlined,
  CheckCircleOutlined,
  LogoutOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useOutpatientStore } from '@/store/outpatientStore';
import { env } from '@/utils/config';
import '@/styles/outpatient-workbench.css';
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

const { Header } = Layout;
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
  const queue = useOutpatientStore((s) => s.queue);
  const loading = useOutpatientStore((s) => s.loading);
  const error = useOutpatientStore((s) => s.error);
  const fetchWaitingQueue = useOutpatientStore((s) => s.fetchWaitingQueue);
  const syncDoctorFromAuth = useOutpatientStore((s) => s.syncDoctorFromAuth);
  const currentPatient = useOutpatientStore((s) => s.currentPatient);
  const currentEncounterId = useOutpatientStore((s) => s.currentEncounterId);
  const startConsultation = useOutpatientStore((s) => s.startConsultation);
  const finishEncounter = useOutpatientStore((s) => s.finishEncounter);
  const activeTab = useOutpatientStore((s) => s.activeTab);
  const setActiveTab = useOutpatientStore((s) => s.setActiveTab);

  useEffect(() => {
    syncDoctorFromAuth();
    void fetchWaitingQueue();
  }, [fetchWaitingQueue, syncDoctorFromAuth]);

  const handleSelect = (encounterId: string): void => {
    void startConsultation(encounterId);
    setActiveTab('consult');
  };

  /** 叫号：选中队列中第一位候诊患者 */
  const callNext = (): void => {
    const next = queue.find((q) => q.status === 'waiting');
    if (next) {
      handleSelect(next.encounterId);
    }
  };

  return (
    <Layout className="outpatient-workbench">
      <Header
        className="!px-4 flex items-center justify-between shrink-0"
        style={{ background: '#0A4D8C', color: '#fff', height: 56, lineHeight: '56px' }}
      >
        <Space size="large">
          <span className="font-bold text-base">健澜科技 jlmedaios · 门诊工作台</span>
          {doctor?.deptName && <Tag color="blue-inverse">{doctor.deptName}</Tag>}
        </Space>
        <Space size="middle">
          <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
            {doctor ? `${doctor.doctorName} · ${doctor.title}` : ''}
          </Text>
          <Button size="small" icon={<AudioOutlined />} onClick={callNext}>
            叫号
          </Button>
          <Button
            size="small"
            icon={<CheckCircleOutlined />}
            disabled={!currentEncounterId}
            onClick={() => void finishEncounter()}
          >
            完成就诊
          </Button>
          <Button size="small" icon={<LogoutOutlined />} onClick={() => navigate('/')}>
            退出
          </Button>
        </Space>
      </Header>

      {error && (
        <Alert
          type="error"
          showIcon
          banner
          message={`后端服务或数据库连接异常：${error}`}
        />
      )}
      {env.mockEnabled && (
        <Alert
          type="warning"
          showIcon
          banner
          message="演示模式（DEMO_MODE）：当前数据可能为本地演示数据，非真实生产链路。"
        />
      )}
      {loading && !error && (
        <Alert type="info" showIcon banner message="正在从医院信息系统加载…" />
      )}

      <div className="outpatient-workbench__body">
        <aside className="outpatient-col outpatient-col--left">
          <div className="outpatient-col__inner p-2 space-y-2">
            <WaitingQueue onSelect={handleSelect} />
            <OutpatientStats />
          </div>
        </aside>

        <main className="outpatient-col outpatient-col--center p-3">
          {!currentPatient ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <RobotOutlined style={{ fontSize: 48, color: '#0A4D8C' }} />
                <div className="mt-3 text-ink-secondary">
                  请从左侧候诊队列选择患者，或点击“叫号”
                </div>
              </div>
            </div>
          ) : (
            <div className="min-w-0">
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
                className="min-w-0"
                activeKey={activeTab}
                onChange={setActiveTab}
                items={MIDDLE_TABS.map((t) => ({ key: t.key, label: t.label }))}
              />
              <div className="bg-white rounded p-3 min-w-0">
                {activeTab === 'consult' && <ConsultationForm />}
                {activeTab === 'diagnosis' && <DiagnosisPanel />}
                {activeTab === 'prescription' && <PrescriptionPanel />}
                {activeTab === 'order' && <OrderPanel />}
                {activeTab === 'record' && <MedicalRecordPanel />}
                {activeTab === 'referral' && <ReferralPanel />}
              </div>
            </div>
          )}
        </main>

        <aside className="outpatient-col outpatient-col--right">
          <div className="outpatient-col__inner p-2 space-y-2">
            <PatientSummaryPanel />
            <AIAssistant />
          </div>
        </aside>
      </div>
    </Layout>
  );
};

export default OutpatientPage;
