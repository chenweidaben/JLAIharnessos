/**
 * 健澜科技 jlmedaios - 住院工作台（M1-A ADT 真实闭环）
 *
 * 标签：
 *  - 床位总览 / 在院患者 / 入院登记：全部真实 BFF，ADT 事务落 PostgreSQL；
 *  - 查房护理（M1-B·演示）：急诊分诊、查房护理、交接班、手术、深度出院属 M1-B，
 *      当前为演示数据，明确标注，不宣称已真实闭环。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Layout, Spin, Tabs, Tag, Typography } from 'antd';
import {
  AuditOutlined,
  HomeOutlined,
  MedicineBoxOutlined,
  ScissorOutlined,
  UserAddOutlined,
  UserSwitchOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useInpatientStore } from '@/store/inpatientStore';
import InpatientBedMap from '@/components/inpatient/InpatientBedMap';
import InpatientList from '@/components/inpatient/InpatientList';
import AdmissionForm from '@/components/inpatient/AdmissionForm';
import BedPatientDrawer from '@/components/inpatient/BedPatientDrawer';
import DemoModeBanner from '@/components/common/DemoModeBanner';

import { useWardStore } from '@/store/wardStore';
import RoundList from '@/components/ward/RoundList';
import Handover from '@/components/ward/Handover';
import DischargePanel from '@/components/ward/DischargePanel';
import SurgeryPanel from '@/components/ward/SurgeryPanel';

const { Header, Content } = Layout;

/** M1-B 规划面板：明确标注为演示数据（查房/交接/出院/手术），不在本轮宣称完成 */
function M1bPanel() {
  const { roundList, handovers, discharges, surgeries, fetchRoundList, startRound, saveHandover } =
    useWardStore();
  useEffect(() => {
    void fetchRoundList();
  }, [fetchRoundList]);

  return (
    <div className="space-y-3">
      <Alert
        type="warning"
        showIcon
        message="M1-B 规划功能 · 当前为演示数据"
        description="急诊分诊/绿色通道、住院查房护理、交接班、手术管理、深度出院流程属 M1-B 范围，尚未真实落库，请勿用于真实业务；以下数据来自本地演示。"
      />
      <Tabs
        items={[
          {
            key: 'round',
            label: (
              <span>
                <AuditOutlined /> 今日查房
              </span>
            ),
            children: <RoundList list={roundList} onStartRound={(id) => void startRound(id)} />,
          },
          {
            key: 'handover',
            label: (
              <span>
                <UserSwitchOutlined /> 交接班
              </span>
            ),
            children: <Handover records={handovers} onSave={(r) => void saveHandover(r)} />,
          },
          {
            key: 'discharge',
            label: (
              <span>
                <MedicineBoxOutlined /> 深度出院
              </span>
            ),
            children: <DischargePanel list={discharges} />,
          },
          {
            key: 'surgery',
            label: (
              <span>
                <ScissorOutlined /> 手术管理
              </span>
            ),
            children: <SurgeryPanel list={surgeries} />,
          },
        ]}
      />
    </div>
  );
}

export default function WardWorkbench() {
  const { ready, health, checkHealth, fetchBedMap, fetchPatients } = useInpatientStore();
  const [tab, setTab] = useState('bedmap');

  useEffect(() => {
    void checkHealth();
    void fetchBedMap();
    void fetchPatients();
  }, [checkHealth, fetchBedMap, fetchPatients]);

  return (
    <Layout className="min-h-screen bg-ink-bg">
      <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
        <div className="flex items-center gap-3">
          <MedicineBoxOutlined className="text-2xl text-white" />
          <Typography.Title level={4} className="!mb-0 !text-white">
            住院工作台 · ADT
          </Typography.Title>
          <span className="hidden text-sm text-white/70 md:inline">
            入院 / 换床 / 转科 / 出院 · AI 辅助，医师复核签名
          </span>
        </div>
        <span className="text-xs text-white/60">健澜科技 jlmedaios</span>
      </Header>
      <Content className="p-4">
        <DemoModeBanner />

        {/* 真实模式下 BFF/数据库不可用：明确报错，阻断并提示，绝不静默造假 */}
        {ready === false && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            message="无法连接 BFF 或数据库"
            description="住院事务需要真实数据库支持。请确认 PostgreSQL（5433）与 BFF（8080）已启动；如需无库演示，请将 DEMO_MODE 置为 1 并显示演示水印。"
          />
        )}
        {ready === true && health?.demoMode && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="BFF 当前为演示模式（DEMO_MODE=1），数据不持久化"
          />
        )}

        <Spin spinning={ready === null}>
          <Tabs
            activeKey={tab}
            onChange={setTab}
            items={[
              {
                key: 'bedmap',
                label: (
                  <span>
                    <HomeOutlined /> 床位总览
                  </span>
                ),
                children: <InpatientBedMap />,
              },
              {
                key: 'patients',
                label: (
                  <span>
                    <TeamOutlined /> 在院患者
                  </span>
                ),
                children: <InpatientList />,
              },
              {
                key: 'admit',
                label: (
                  <span>
                    <UserAddOutlined /> 入院登记
                  </span>
                ),
                children: <AdmissionForm />,
              },
              {
                key: 'm1b',
                label: (
                  <span>
                    <AuditOutlined /> 查房护理
                    <Tag color="orange" style={{ marginInlineStart: 6, fontSize: 10 }}>
                      M1-B 演示
                    </Tag>
                  </span>
                ),
                children: <M1bPanel />,
              },
            ]}
          />
        </Spin>
      </Content>

      {/* 床位患者摘要抽屉（全局单挂） */}
      <BedPatientDrawer />
    </Layout>
  );
}
