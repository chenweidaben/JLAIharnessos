/**
 * 健澜科技 jlmedaios - 护理 NQI 与互联互通合规看板（M472）
 *
 * 路由：/quality/compliance-board
 * 三卡：NQI 敏感指标发生率 / 互联互通资源目录 / 电子病历五级缺口清单
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, type ReactElement } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  MinusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type {
  InteropCatalogRow,
  Level5GapRow,
  NqiIncidenceRow,
} from '@/services/api/compliance';
import { useComplianceBoardStore } from '@/store/complianceBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
} as const;

const TREND_META: Record<NqiIncidenceRow['trend'], { color: string; icon: ReactElement }> = {
  down: { color: 'green', icon: <ArrowDownOutlined /> },
  up: { color: 'red', icon: <ArrowUpOutlined /> },
  flat: { color: 'default', icon: <MinusOutlined /> },
};

const NQI_COLUMNS: ColumnsType<NqiIncidenceRow> = [
  { title: '敏感指标', dataIndex: 'indicator' },
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="blue">{v}</Tag> },
  {
    title: '发生数/暴露数',
    dataIndex: 'numerator',
    render: (_: number, r) => `${r.numerator} / ${r.denominator}`,
  },
  {
    title: '发生率(%)',
    dataIndex: 'rate',
    render: (v: number, r) => (
      <Text strong style={{ color: v > r.benchmark ? '#cf1322' : '#389e0d' }}>
        {v.toFixed(2)}
      </Text>
    ),
    sorter: (a, b) => a.rate - b.rate,
  },
  {
    title: '基准(%)',
    dataIndex: 'benchmark',
    render: (v: number) => v.toFixed(2),
  },
  {
    title: '环比',
    dataIndex: 'trend',
    render: (v: NqiIncidenceRow['trend']) => {
      const m = TREND_META[v];
      return <Tag color={m.color} icon={m.icon}>{v === 'up' ? '上升' : v === 'down' ? '下降' : '持平'}</Tag>;
    },
  },
  { title: '周期', dataIndex: 'period' },
];

const INTEROP_COLUMNS: ColumnsType<InteropCatalogRow> = [
  { title: '资源', dataIndex: 'resource' },
  { title: '类别', dataIndex: 'category', render: (v: string) => <Tag>{v}</Tag> },
  {
    title: '标准',
    dataIndex: 'standard',
    render: (v: string) => <Tag color="cyan">{v}</Tag>,
  },
  {
    title: '方向',
    dataIndex: 'direction',
    render: (v: InteropCatalogRow['direction']) => (
      <Tag color={v === 'in' ? 'green' : 'orange'}>
        {v === 'in' ? '接入' : '输出'}
      </Tag>
    ),
  },
  { title: '消费方', dataIndex: 'consumer' },
  {
    title: '状态',
    dataIndex: 'status',
    render: (v: InteropCatalogRow['status']) => (
      <Tag
        color={v === 'online' ? 'success' : v === 'pending' ? 'processing' : 'default'}
      >
        {v === 'online' ? '在线' : v === 'pending' ? '待上线' : '离线'}
      </Tag>
    ),
  },
];

const SEVERITY_META: Record<Level5GapRow['severity'], { color: string; label: string }> = {
  high: { color: 'red', label: '高' },
  medium: { color: 'orange', label: '中' },
  low: { color: 'default', label: '低' },
};

const GAP_COLUMNS: ColumnsType<Level5GapRow> = [
  { title: '缺口项', dataIndex: 'item' },
  {
    title: '维度',
    dataIndex: 'dimension',
    render: (v: string) => <Tag color="blue">{v}</Tag>,
  },
  {
    title: '现状 → 目标',
    render: (_, r) => `${r.currentLevel} → ${r.targetLevel}`,
  },
  {
    title: '严重度',
    dataIndex: 'severity',
    render: (v: Level5GapRow['severity']) => {
      const m = SEVERITY_META[v];
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '责任人', dataIndex: 'owner' },
  { title: '截止', dataIndex: 'dueAt' },
];

export default function ComplianceBoardM472Page() {
  usePageTitle('护理 NQI 与互联互通看板');
  const { nqi, interop, gaps, loading, error, demo, load } = useComplianceBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && nqi.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载合规看板…" />
      </div>
    );
  }

  const highGaps = gaps.filter((g) => g.severity === 'high').length;
  const onlineInterop = interop.filter((i) => i.status === 'online').length;
  const overBenchmark = nqi.filter((n) => n.rate > n.benchmark).length;

  return (
    <PageContainer
      title="护理 NQI 与互联互通合规看板"
      description="P0 合规：护理敏感质量指标 / 互联互通成熟度 / 电子病历五级评级"
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>
          刷新
        </Button>
      }
    >
      {error && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={error}
          action={
            <Button size="small" onClick={() => void load()}>
              重试
            </Button>
          }
        />
      )}
      {demo && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="当前展示为 DEMO 兜底数据（BFF /compliance/* 接入后自动切换为真实指标）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={8}>
          <Card style={{ borderTop: `3px solid #cf1322` }}>
            <Statistic
              title="超基准 NQI 指标"
              value={overBenchmark}
              suffix={`/ ${nqi.length}`}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="互联互通在线资源"
              value={onlineInterop}
              suffix={`/ ${interop.length}`}
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card style={{ borderTop: `3px solid ${JL.navy}` }}>
            <Statistic
              title="五级高优缺口"
              value={highGaps}
              suffix={`/ ${gaps.length}`}
              valueStyle={{ color: JL.navy }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={<span style={{ color: JL.navy, fontWeight: 600 }}>护理敏感质量指标(NQI)发生率</span>}
        style={{ borderTop: `3px solid ${JL.navy}`, marginBottom: 16 }}
      >
        <Table
          rowKey="id"
          columns={NQI_COLUMNS}
          dataSource={nqi}
          pagination={false}
          size="middle"
        />
      </Card>

      <Card
        title={<span style={{ color: JL.navy, fontWeight: 600 }}>互联互通成熟度资源目录</span>}
        style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
      >
        <Table
          rowKey="id"
          columns={INTEROP_COLUMNS}
          dataSource={interop}
          pagination={false}
          size="middle"
        />
      </Card>

      <Card
        title={<span style={{ color: JL.navy, fontWeight: 600 }}>电子病历五级评级缺口清单</span>}
        style={{ borderTop: `3px solid ${JL.accent}` }}
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
