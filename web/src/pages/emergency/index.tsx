/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 急诊分诊工作台页面（/emergency）
 *
 * 启动先探活 BFF + 真实数据库：
 *  - 就绪：正常渲染，全部读写真实落库；
 *  - 演示模式（DEMO_MODE=1）：显示 DEMO 水印与横幅；
 *  - BFF/数据库不可达：明确报错，区域置灰并加 DEMO/离线水印，禁止写操作。
 */
import { useEffect, useState } from 'react';
import { Alert, Spin, Tabs, Watermark } from 'antd';
import {
  BarChartOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  HeartOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import {
  EmergencyRecord,
  EmergencyStats,
  GreenChannel,
  Observation,
  ResuscitationRoom,
  TriageStation,
} from '@/components/emergency';
import { useEmergencyStore } from '@/store/emergencyStore';

type TabKey = 'triage' | 'green' | 'resus' | 'obs' | 'stats' | 'record';

export default function EmergencyPage() {
  const [tab, setTab] = useState<TabKey>('triage');
  const { ready, health, error, checkHealth, refreshAll } = useEmergencyStore();

  useEffect(() => {
    void (async () => {
      await checkHealth();
    })();
  }, [checkHealth]);

  useEffect(() => {
    if (ready === true) void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const demoMode = health?.demoMode === true;

  // 水印内容：演示模式 / 离线不可用；健康真实模式不加水印
  const watermark =
    ready === false
      ? ['DEMO 离线', '数据库不可用']
      : demoMode
        ? ['DEMO 演示模式', '数据不持久化']
        : null;

  const tabs = (
    <Tabs
      activeKey={tab}
      onChange={(k) => setTab(k as TabKey)}
      items={[
        { key: 'triage', label: <span><SafetyCertificateOutlined /> 分诊台</span>, children: <TriageStation /> },
        { key: 'green', label: <span><HeartOutlined /> 绿色通道</span>, children: <GreenChannel /> },
        { key: 'resus', label: <span><ThunderboltOutlined /> 抢救室</span>, children: <ResuscitationRoom /> },
        { key: 'obs', label: <span><ClockCircleOutlined /> 留观管理</span>, children: <Observation /> },
        { key: 'stats', label: <span><BarChartOutlined /> 急诊统计</span>, children: <EmergencyStats /> },
        { key: 'record', label: <span><FileTextOutlined /> 急诊档案</span>, children: <EmergencyRecord /> },
      ]}
    />
  );

  return (
    <PageContainer
      title="急诊分诊工作台"
      description="四级分诊 · 绿色通道 · 抢救室 · 留观 · 急诊统计 —— 健澜科技数智医院智能体"
    >
      <DemoModeBanner />

      {ready === false && (
        <Alert
          type="error"
          showIcon
          message="无法连接急诊后端或真实数据库"
          description={
            <div>
              <div>
                当前不能进行任何急诊读写，所有写操作已禁用。请检查 BFF（:8080）与
                PostgreSQL（:5433）是否启动；界面已加 DEMO/离线水印，避免被误认为真实闭环。
              </div>
              {error && <div className="mt-1 text-xs">错误详情：{error}</div>}
            </div>
          }
          style={{ marginBottom: 12 }}
        />
      )}

      {ready === null ? (
        <div className="flex h-64 items-center justify-center">
          <Spin size="large" tip="正在探测急诊后端与数据库…" />
        </div>
      ) : watermark ? (
        <Watermark content={watermark} gap={[120, 120]}>
          <div style={{ filter: ready === false ? 'grayscale(1)' : undefined, opacity: ready === false ? 0.7 : 1 }}>
            {tabs}
          </div>
        </Watermark>
      ) : (
        tabs
      )}
    </PageContainer>
  );
}
