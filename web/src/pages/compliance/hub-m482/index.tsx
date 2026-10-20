/**
 * 健澜科技 jlmedaios - 全院合规总览驾驶舱（M482）
 * 路由：/compliance/hub
 * 顶部 6 KPI + 2x3 mini progress 网格 + 缺口清单 Table
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9；达标 #52C41A / 未达标 #FA8C16 / 警示 #D9534F
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { HubGap } from '@/services/api/complianceHub';
import { useComplianceHubStore } from '@/store/complianceHubStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  warn: '#FA8C16',
  bad: '#D9534F',
} as const;

const STATUS_META: Record<string, { color: string; label: string; bar: string }> = {
  ok: { color: JL.ok, label: '达标', bar: JL.ok },
  warn: { color: JL.warn, label: '未达标', bar: JL.warn },
  bad: { color: JL.bad, label: '警示', bar: JL.bad },
};

const PRIORITY_META: Record<string, { color: string; label: string }> = {
  high: { color: 'red', label: '高' },
  medium: { color: 'orange', label: '中' },
  low: { color: 'blue', label: '低' },
};

const GAP_COLUMNS: ColumnsType<HubGap> = [
  { title: '维度', dataIndex: 'dimension', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '缺口项', dataIndex: 'item' },
  { title: '责任科室', dataIndex: 'dept' },
  { title: '整改期限', dataIndex: 'due' },
  {
    title: '优先级',
    dataIndex: 'priority',
    render: (v: string) => {
      const m = PRIORITY_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
];

export default function ComplianceHubM482Page() {
  usePageTitle('全院合规总览驾驶舱');
  const { kpis, gaps, loading, error, demo, load } = useComplianceHubStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && kpis.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载合规驾驶舱…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="全院合规总览驾驶舱"
      description="电子病历五级 / 互联互通四甲 / 智慧服务三级 / 院感 / DRG / 门急诊 一屏总览"
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>
          刷新
        </Button>
      }
    >
      {error && (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }} message={error} />
      )}
      {demo && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="当前展示为 DEMO 兜底数据（BFF 各看板端点接入后自动切换为真实数据）"
        />
      )}

      {/* 顶部 6 KPI */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {kpis.map((k) => {
          const m = STATUS_META[k.status];
          const pct =
            k.key === 'infection'
              ? Math.min(100, (k.benchmark / Math.max(k.score, 0.01)) * 100)
              : Math.min(100, (k.score / Math.max(k.benchmark, 0.01)) * 100);
          return (
            <Col xs={8} key={k.key}>
              <Card style={{ borderTop: `3px solid ${m.bar}` }}>
                <Statistic
                  title={
                    <span style={{ color: JL.navy }}>
                      {k.title}{' '}
                      <Tag color={m.color} style={{ marginLeft: 8 }}>
                        {m.label}
                      </Tag>
                    </span>
                  }
                  value={k.score}
                  suffix={k.unit}
                  valueStyle={{ color: m.bar, fontWeight: 700 }}
                />
                <div style={{ marginTop: 12 }}>
                  <Progress percent={Math.round(pct)} size="small" strokeColor={m.bar} />
                  <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 4 }}>{k.note}</div>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* 缺口清单 */}
      <Card
        title={<span style={{ color: JL.navy, fontWeight: 600 }}>未达标缺口与整改清单</span>}
        style={{ borderTop: `3px solid ${JL.bad}` }}
      >
        <Table
          rowKey="id"
          columns={GAP_COLUMNS}
          dataSource={gaps}
          pagination={false}
          size="middle"
        />
      </Card>
    </PageContainer>
  );
}
