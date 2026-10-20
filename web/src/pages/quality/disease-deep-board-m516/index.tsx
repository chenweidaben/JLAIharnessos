/**
 * 健澜科技 jlmedaios - 单病种质控深度看板（M516）
 * 路由：/quality/disease-deep-board
 * 顶部 KPI：在管病种数 / 过程质控达标率 / 平均病死率 / 并发症发生率
 * 过程质控 / 结局指标 / 并发症
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { ComplicationRow, OutcomeRow, ProcessRow } from '@/services/api/diseaseDeepBoard';
import { useDiseaseDeepBoardStore } from '@/store/diseaseDeepBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const DISEASE: Record<string, { color: string; label: string }> = {
  STEMI: { color: 'blue', label: '急性心梗' },
  stroke: { color: 'orange', label: '脑卒中' },
  pneumonia: { color: 'red', label: '肺炎' },
  hipFracture: { color: 'purple', label: '髋部骨折' },
  cesarean: { color: 'green', label: '剖宫产' },
};

const COMP_TYPE: Record<string, { color: string; label: string }> = {
  bleeding: { color: 'orange', label: '出血' },
  infection: { color: 'red', label: '感染' },
  thrombosis: { color: 'purple', label: '血栓' },
  poorHealing: { color: 'blue', label: '伤口不愈' },
};

function processTag(r: number) {
  if (r >= 90) return <Tag color="green">{r.toFixed(1)}%</Tag>;
  if (r >= 70) return <Tag color="orange">{r.toFixed(1)}%</Tag>;
  return <Tag color="red">{r.toFixed(1)}%</Tag>;
}

function mortalityTag(r: number) {
  if (r < 1) return <Tag color="green">{r.toFixed(2)}%</Tag>;
  if (r <= 5) return <Tag color="orange">{r.toFixed(2)}%</Tag>;
  return <Tag color="red">{r.toFixed(2)}%</Tag>;
}

function compRateTag(r: number) {
  if (r < 2) return <Tag color="green">{r.toFixed(2)}%</Tag>;
  if (r <= 5) return <Tag color="orange">{r.toFixed(2)}%</Tag>;
  return <Tag color="red">{r.toFixed(2)}%</Tag>;
}

const PROCESS_COLUMNS: ColumnsType<ProcessRow> = [
  {
    title: '病种',
    dataIndex: 'disease',
    render: (v: string) => {
      const m = DISEASE[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  {
    title: '质控指标完成率',
    dataIndex: 'completionRate',
    render: (v: number) => (
      <>
        <Progress percent={v} size="small" style={{ width: 120, marginRight: 8 }} />
        {processTag(v)}
      </>
    ),
    sorter: (a, b) => b.completionRate - a.completionRate,
  },
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="blue">{v}</Tag> },
];

const OUTCOME_COLUMNS: ColumnsType<OutcomeRow> = [
  { title: '病种', dataIndex: 'disease', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '病死率',
    dataIndex: 'mortalityRate',
    render: (v: number) => mortalityTag(v),
    sorter: (a, b) => b.mortalityRate - a.mortalityRate,
  },
  { title: '再入院率', dataIndex: 'readmissionRate', render: (v: number) => `${v.toFixed(2)}%` },
  { title: '平均住院日(天)', dataIndex: 'avgLosDays', render: (v: number) => v.toFixed(1) },
];

const COMP_COLUMNS: ColumnsType<ComplicationRow> = [
  { title: '病种', dataIndex: 'disease', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '并发症类型',
    dataIndex: 'type',
    render: (v: string) => {
      const m = COMP_TYPE[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  {
    title: '发生率',
    dataIndex: 'rate',
    render: (v: number) => compRateTag(v),
    sorter: (a, b) => b.rate - a.rate,
  },
];

export default function DiseaseDeepBoardM516Page() {
  usePageTitle('单病种质控深度看板');
  const { process, outcome, complications, loading, error, demo, load } = useDiseaseDeepBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpi = useMemo(() => {
    const avgProcess =
      process.reduce((a, p) => a + p.completionRate, 0) / (process.length || 1);
    const avgMortality =
      outcome.reduce((a, o) => a + o.mortalityRate, 0) / (outcome.length || 1);
    const avgComp =
      complications.reduce((a, c) => a + c.rate, 0) / (complications.length || 1);
    return { avgProcess, avgMortality, avgComp };
  }, [process, outcome, complications]);

  if (loading && process.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载单病种看板…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="单病种质控深度看板（电子病历五级 P0）"
      description="过程 / 结局 / 并发症 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /disease/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="在管病种数"
              value={process.length}
              suffix="个"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic
              title="过程质控达标率"
              value={kpi.avgProcess}
              precision={1}
              suffix="%"
              valueStyle={{ color: JL.accent }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.ok}` }}>
            <Statistic
              title="平均病死率"
              value={kpi.avgMortality}
              precision={2}
              suffix="%"
              valueStyle={{ color: JL.ok }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.warn}` }}>
            <Statistic
              title="并发症发生率"
              value={kpi.avgComp}
              precision={2}
              suffix="%"
              valueStyle={{ color: JL.warn }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>过程质控</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={PROCESS_COLUMNS} dataSource={process} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>结局指标</span>}
            style={{ borderTop: `3px solid ${JL.ok}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={OUTCOME_COLUMNS} dataSource={outcome} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>

      <Card
        title={<span style={{ color: JL.navy, fontWeight: 600 }}>并发症</span>}
        style={{ borderTop: `3px solid ${JL.warn}` }}
      >
        <Table rowKey="id" columns={COMP_COLUMNS} dataSource={complications} pagination={false} size="middle" />
      </Card>
    </PageContainer>
  );
}
