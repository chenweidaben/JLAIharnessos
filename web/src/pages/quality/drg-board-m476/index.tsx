/**
 * 健澜科技 jlmedaios - DRG/单病种经济运行看板（M476）
 * 路由：/quality/drg-board
 * 顶部 KPI：DRG 覆盖病例数 / 平均权重(CMI) / 费用偏差率 / 临床路径入径率
 * 中部：DRG 分组 Table（费用偏差 Tag，超支 #D9534F）
 * 底部：单病种 Table + 临床路径 Table（入径率/完成率/变异率 Progress 条）
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9；超支 #D9534F
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Progress,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type {
  ClinicalPathRow,
  DrgGroupRow,
  SingleDiseaseRow,
} from '@/services/api/drgBoard';
import { useDrgBoardStore } from '@/store/drgBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  danger: '#D9534F',
} as const;

const GROUP_COLUMNS: ColumnsType<DrgGroupRow> = [
  { title: 'DRG 编码', dataIndex: 'groupCode', render: (v: string) => <Tag color="cyan">{v}</Tag> },
  { title: '组名', dataIndex: 'groupName', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '权重',
    dataIndex: 'weight',
    render: (v: number) => v.toFixed(2),
    sorter: (a, b) => b.weight - a.weight,
  },
  { title: '病例数', dataIndex: 'caseCount', sorter: (a, b) => b.caseCount - a.caseCount },
  {
    title: '次均费用',
    dataIndex: 'avgCost',
    render: (v: number) => `¥${v.toLocaleString()}`,
  },
  { title: '目标费用', dataIndex: 'targetCost', render: (v: number) => `¥${v.toLocaleString()}` },
  {
    title: '费用偏差',
    dataIndex: 'deviationRate',
    render: (v: number) => {
      const over = v > 0;
      return (
        <Tag color={over ? 'red' : 'green'} style={{ color: over ? JL.danger : '#389e0d' }}>
          {over ? '超支 ' : '结余 '}{Math.abs(v).toFixed(1)}%
        </Tag>
      );
    },
    sorter: (a, b) => b.deviationRate - a.deviationRate,
  },
];

const SINGLE_COLUMNS: ColumnsType<SingleDiseaseRow> = [
  { title: '病种', dataIndex: 'disease', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '例数', dataIndex: 'caseCount', sorter: (a, b) => b.caseCount - a.caseCount },
  {
    title: '平均住院日(天)',
    dataIndex: 'avgLos',
    render: (v: number) => v.toFixed(1),
    sorter: (a, b) => b.avgLos - a.avgLos,
  },
  {
    title: '次均费用',
    dataIndex: 'avgCost',
    render: (v: number) => `¥${v.toLocaleString()}`,
    sorter: (a, b) => b.avgCost - a.avgCost,
  },
  {
    title: '治愈率',
    dataIndex: 'cureRate',
    render: (v: number) => (
      <Progress
        percent={v}
        size="small"
        style={{ width: 120 }}
        strokeColor={v >= 95 ? '#389e0d' : v >= 90 ? JL.blue : 'orange'}
      />
    ),
  },
];

const PATH_COLUMNS: ColumnsType<ClinicalPathRow> = [
  { title: '路径', dataIndex: 'pathName', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="blue">{v}</Tag> },
  {
    title: '入径率',
    dataIndex: 'enrollRate',
    render: (v: number) => (
      <Progress percent={v} size="small" style={{ width: 110 }} strokeColor={JL.accent} />
    ),
    sorter: (a, b) => b.enrollRate - a.enrollRate,
  },
  {
    title: '完成率',
    dataIndex: 'completeRate',
    render: (v: number) => (
      <Progress percent={v} size="small" style={{ width: 110 }} strokeColor="#389e0d" />
    ),
    sorter: (a, b) => b.completeRate - a.completeRate,
  },
  {
    title: '变异率',
    dataIndex: 'deviationRate',
    render: (v: number) => (
      <Progress
        percent={v}
        size="small"
        style={{ width: 110 }}
        strokeColor={v > 20 ? JL.danger : 'orange'}
      />
    ),
    sorter: (a, b) => b.deviationRate - a.deviationRate,
  },
];

export default function DrgBoardM476Page() {
  usePageTitle('DRG/单病种经济运行看板');
  const { groups, costSummary, singleDisease, clinicalPath, loading, error, demo, load } =
    useDrgBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && groups.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载 DRG 看板…" />
      </div>
    );
  }

  const totalCases = costSummary.find((c) => c.metric.includes('病例'))?.value ?? 0;
  const cmi = costSummary.find((c) => c.metric.includes('CMI'))?.value ?? 0;
  const dev = costSummary.find((c) => c.metric.includes('偏差'))?.value ?? 0;
  const avgEnroll =
    clinicalPath.length > 0
      ? clinicalPath.reduce((s, p) => s + p.enrollRate, 0) / clinicalPath.length
      : 0;

  return (
    <PageContainer
      title="DRG/单病种经济运行看板"
      description="DRG 分组盈亏 + 单病种指标 + 临床路径入径完成情况"
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
          message="当前展示为 DEMO 兜底数据（BFF /drg/* 接入后自动切换为真实指标）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={6}>
          <Card style={{ borderTop: `3px solid ${JL.navy}` }}>
            <Statistic title="DRG 覆盖病例数" value={totalCases} suffix="例" valueStyle={{ color: JL.navy }} />
          </Card>
        </Col>
        <Col xs={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic title="平均权重(CMI)" value={cmi} precision={2} valueStyle={{ color: JL.blue }} />
          </Card>
        </Col>
        <Col xs={6}>
          <Card style={{ borderTop: `3px solid ${dev > 5 ? JL.danger : '#389e0d'}` }}>
            <Statistic
              title="费用偏差率"
              value={dev}
              precision={2}
              suffix="%"
              valueStyle={{ color: dev > 5 ? JL.danger : '#389e0d' }}
            />
          </Card>
        </Col>
        <Col xs={6}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic
              title="临床路径入径率"
              value={avgEnroll}
              precision={1}
              suffix="%"
              valueStyle={{ color: JL.accent }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={<span style={{ color: JL.navy, fontWeight: 600 }}>DRG 分组盈亏</span>}
        style={{ borderTop: `3px solid ${JL.navy}`, marginBottom: 16 }}
      >
        <Table
          rowKey="id"
          columns={GROUP_COLUMNS}
          dataSource={groups}
          pagination={false}
          size="middle"
        />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>单病种指标</span>}
            style={{ borderTop: `3px solid ${JL.blue}` }}
          >
            <Table
              rowKey="id"
              columns={SINGLE_COLUMNS}
              dataSource={singleDisease}
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>临床路径执行</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table
              rowKey="id"
              columns={PATH_COLUMNS}
              dataSource={clinicalPath}
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
