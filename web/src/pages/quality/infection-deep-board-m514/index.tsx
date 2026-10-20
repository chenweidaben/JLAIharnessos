/**
 * 健澜科技 jlmedaios - 院感监控深度看板（M514）
 * 路由：/quality/infection-deep-board
 * 顶部 KPI：本月院感病例 / 院感发生率 / MDRO 检出率 / 手卫生依从率
 * 院感发生率 / 手卫生依从
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { DeepRateRow, HandHygieneRow } from '@/services/api/infectionDeepBoard';
import { useInfectionDeepBoardStore } from '@/store/infectionDeepBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const RATE_TYPE: Record<string, { color: string; label: string }> = {
  VAP: { color: 'orange', label: 'VAP' },
  CLABSI: { color: 'red', label: 'CLABSI' },
  CAUTI: { color: 'purple', label: 'CAUTI' },
  SSI: { color: 'blue', label: 'SSI' },
  MDRO: { color: 'green', label: 'MDRO' },
};

function rateTag(r: number) {
  if (r < 1) return <Tag color="green">{r.toFixed(2)}‰</Tag>;
  if (r <= 5) return <Tag color="orange">{r.toFixed(2)}‰</Tag>;
  return <Tag color="red">{r.toFixed(2)}‰</Tag>;
}

function complianceTag(r: number) {
  if (r >= 95) return <Tag color="green">{r.toFixed(1)}%</Tag>;
  if (r >= 85) return <Tag color="orange">{r.toFixed(1)}%</Tag>;
  return <Tag color="red">{r.toFixed(1)}%</Tag>;
}

const RATE_COLUMNS: ColumnsType<DeepRateRow> = [
  {
    title: '感染类型',
    dataIndex: 'type',
    render: (v: string) => {
      const m = RATE_TYPE[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="blue">{v}</Tag> },
  {
    title: '发生率',
    dataIndex: 'ratePerMillion',
    render: (v: number) => rateTag(v),
    sorter: (a, b) => b.ratePerMillion - a.ratePerMillion,
  },
];

const HAND_COLUMNS: ColumnsType<HandHygieneRow> = [
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '观察次数', dataIndex: 'observations', sorter: (a, b) => b.observations - a.observations },
  {
    title: '依从率',
    dataIndex: 'complianceRate',
    render: (v: number) => complianceTag(v),
    sorter: (a, b) => b.complianceRate - a.complianceRate,
  },
  {
    title: '手消消耗量',
    dataIndex: 'sanitizerUsed',
    render: (v: number) => `${v.toLocaleString()} mL`,
  },
];

export default function InfectionDeepBoardM514Page() {
  usePageTitle('院感监控深度看板');
  const { rates, handHygiene, stats, loading, error, demo, load } = useInfectionDeepBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && rates.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载院感看板…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="院感监控深度看板（医疗质量安全 P0）"
      description="院感发生率 / 手卫生依从 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /infection/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="本月院感病例"
              value={stats?.monthlyCases ?? rates.length}
              suffix="例"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.warn}` }}>
            <Statistic
              title="院感发生率"
              value={stats?.infectionRate ?? 0}
              precision={2}
              suffix="%"
              valueStyle={{ color: JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.bad}` }}>
            <Statistic
              title="MDRO 检出率"
              value={stats?.mdroRate ?? 0}
              precision={2}
              suffix="%"
              valueStyle={{ color: JL.bad }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.ok}` }}>
            <Statistic
              title="手卫生依从率"
              value={stats?.handHygieneRate ?? 0}
              precision={1}
              suffix="%"
              valueStyle={{ color: JL.ok }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>院感发生率</span>}
            style={{ borderTop: `3px solid ${JL.bad}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={RATE_COLUMNS} dataSource={rates} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>手卫生依从</span>}
            style={{ borderTop: `3px solid ${JL.ok}` }}
          >
            <Table rowKey="id" columns={HAND_COLUMNS} dataSource={handHygiene} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
