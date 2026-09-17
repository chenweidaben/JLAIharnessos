/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 急诊分诊工作台页面（/emergency）
 */
import { useState } from 'react';
import { Tabs } from 'antd';
import {
  BarChartOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  HeartOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import {
  EmergencyRecord,
  EmergencyStats,
  GreenChannel,
  Observation,
  ResuscitationRoom,
  TriageStation,
} from '@/components/emergency';

type TabKey = 'triage' | 'green' | 'resus' | 'obs' | 'stats' | 'record';

export default function EmergencyPage() {
  const [tab, setTab] = useState<TabKey>('triage');

  return (
    <PageContainer
      title="急诊分诊工作台"
      description="四级分诊 · 绿色通道 · 抢救室 · 留观 · 急诊统计 —— 健澜科技数智医院智能体"
    >
      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as TabKey)}
        items={[
          {
            key: 'triage',
            label: (
              <span>
                <SafetyCertificateOutlined /> 分诊台
              </span>
            ),
            children: <TriageStation />,
          },
          {
            key: 'green',
            label: (
              <span>
                <HeartOutlined /> 绿色通道
              </span>
            ),
            children: <GreenChannel />,
          },
          {
            key: 'resus',
            label: (
              <span>
                <ThunderboltOutlined /> 抢救室
              </span>
            ),
            children: <ResuscitationRoom />,
          },
          {
            key: 'obs',
            label: (
              <span>
                <ClockCircleOutlined /> 留观管理
              </span>
            ),
            children: <Observation />,
          },
          {
            key: 'stats',
            label: (
              <span>
                <BarChartOutlined /> 急诊统计
              </span>
            ),
            children: <EmergencyStats />,
          },
          {
            key: 'record',
            label: (
              <span>
                <FileTextOutlined /> 急诊病历
              </span>
            ),
            children: <EmergencyRecord />,
          },
        ]}
      />
    </PageContainer>
  );
}
