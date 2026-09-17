/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 住院查房工作台 - /ward
 */
import { useEffect, useState } from 'react';
import { Layout, Spin, Tabs, Typography } from 'antd';
import {
  AuditOutlined,
  HomeOutlined,
  MedicineBoxOutlined,
  ScissorOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { useWardStore } from '@/store/wardStore';
import BedMap from '@/components/ward/BedMap';
import RoundList from '@/components/ward/RoundList';
import Handover from '@/components/ward/Handover';
import DischargePanel from '@/components/ward/DischargePanel';
import SurgeryPanel from '@/components/ward/SurgeryPanel';

const { Header, Content } = Layout;

export default function WardWorkbench() {
  const {
    wardInfo,
    roomGroups,
    roundList,
    handovers,
    discharges,
    surgeries,
    loading,
    fetchWardInfo,
    fetchBedMap,
    fetchRoundList,
    startRound,
    saveHandover,
  } = useWardStore();
  const [tab, setTab] = useState('bedmap');

  useEffect(() => {
    void fetchWardInfo();
    void fetchBedMap();
    void fetchRoundList();
  }, [fetchWardInfo, fetchBedMap, fetchRoundList]);

  return (
    <Layout className="min-h-screen bg-ink-bg">
      <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
        <div className="flex items-center gap-3">
          <MedicineBoxOutlined className="text-2xl text-white" />
          <Typography.Title level={4} className="!mb-0 !text-white">
            {wardInfo?.name ?? '住院查房工作台'}
          </Typography.Title>
          <span className="text-sm text-white/70">
            {wardInfo?.department ?? ''} · 主任：{wardInfo?.director ?? '--'} · 管床医生：
            {wardInfo?.chargeDoctor ?? '--'}
          </span>
        </div>
        <span className="text-xs text-white/60">健澜科技数智医院智能体</span>
      </Header>
      <Content className="p-4">
        <Spin spinning={loading}>
          <Tabs
            activeKey={tab}
            onChange={setTab}
            items={[
              {
                key: 'bedmap',
                label: (
                  <span>
                    <HomeOutlined /> 病区床位总览
                  </span>
                ),
                children: <BedMap wardInfo={wardInfo} rooms={roomGroups} />,
              },
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
                    <MedicineBoxOutlined /> 出院管理
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
        </Spin>
      </Content>
    </Layout>
  );
}
