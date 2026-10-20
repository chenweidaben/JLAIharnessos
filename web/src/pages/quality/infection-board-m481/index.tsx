/**
 * 健澜科技 jlmedaios - 院感与患者安全看板（M481）
 * 路由：/quality/infection-board
 * 顶部 KPI：院感发生率 / 手卫生依从率 / MDRO 检出数 / 未闭环安全事件
 * 院感部位 Table（VAP/CLABSI/CAUTI/SSI）+ 手卫生 Table + MDRO Table + 安全事件 Table
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9；超标 #D9534F、达标 #52C41A
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type {
  HandHygieneRow,
  HaiRow,
  MdrRow,
  PatientEventRow,
} from '@/services/api/infectionBoard';
import { useInfectionBoardStore } from '@/store/infectionBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const SEVERITY_META: Record<string, { color: string; label: string }> = {
  sentinel: { color: 'red', label: '警讯事件' },
  severe: { color: 'volcano', label: '严重不良' },
  moderate: { color: 'orange', label: '中度不良' },
  minor: { color: 'blue', label: '未遂事件' },
};

const EVENT_STATUS_META: Record<string, { color: string; label: string }> = {
  open: { color: 'red', label: '待处置' },
  acknowledged: { color: 'orange', label: '已受理' },
  'rca-done': { color: 'cyan', label: 'RCA 完成' },
  closed: { color: 'green', label: '已闭环' },
};

const HAI_COLUMNS: ColumnsType<HaiRow> = [
  { title: '部位', dataIndex: 'type', render: (v: string) => <Tag color="purple">{v}</Tag> },
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '例数', dataIndex: 'infections' },
  { title: '器械日', dataIndex: 'deviceDays' },
  {
    title: '千日发生率',
    dataIndex: 'rate',
    render: (v: number, r) => (
      <Text style={{ color: v > r.benchmark ? JL.bad : JL.ok, fontWeight: 600 }}>
        {v.toFixed(2)}‰
      </Text>
    ),
    sorter: (a, b) => b.rate - a.rate,
  },
  { title: '基准', dataIndex: 'benchmark', render: (v: number) => `${v.toFixed(2)}‰` },
  {
    title: '状态',
    dataIndex: 'rate',
    render: (v: number, r) =>
      v > r.benchmark ? <Tag color="red">超标</Tag> : <Tag color="green">达标</Tag>,
  },
];

const HAND_COLUMNS: ColumnsType<HandHygieneRow> = [
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '观察点数', dataIndex: 'observations', sorter: (a, b) => b.observations - a.observations },
  { title: '合格点数', dataIndex: 'performed' },
  {
    title: '依从率',
    dataIndex: 'rate',
    render: (v: number) => (
      <Progress
        percent={v}
        size="small"
        style={{ width: 160 }}
        strokeColor={v >= 90 ? JL.ok : v >= 80 ? JL.warn : JL.bad}
      />
    ),
    sorter: (a, b) => b.rate - a.rate,
  },
];

const MDR_COLUMNS: ColumnsType<MdrRow> = [
  { title: '菌名', dataIndex: 'bug', render: (v: string) => <Tag color="magenta">{v}</Tag> },
  { title: '科室', dataIndex: 'dept' },
  { title: '检出例数', dataIndex: 'detected', sorter: (a, b) => b.detected - a.detected },
  { title: '已隔离', dataIndex: 'isolated' },
  {
    title: '接触隔离',
    dataIndex: 'contactPrecautions',
    render: (v: boolean) => (v ? <Tag color="red">已启动</Tag> : <Tag color="default">未启动</Tag>),
  },
];

const EVENT_COLUMNS: ColumnsType<PatientEventRow> = [
  { title: '事件类型', dataIndex: 'type', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '科室', dataIndex: 'dept' },
  {
    title: '严重度',
    dataIndex: 'severity',
    render: (v: string) => {
      const m = SEVERITY_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '发生时间', dataIndex: 'occurredAt' },
  {
    title: '状态',
    dataIndex: 'status',
    render: (v: string) => {
      const m = EVENT_STATUS_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
];

export default function InfectionBoardM481Page() {
  usePageTitle('院感与患者安全看板');
  const { hai, handHygiene, mdr, events, loading, error, demo, load } = useInfectionBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && hai.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载院感与患者安全看板…" />
      </div>
    );
  }

  const haiOver = hai.filter((r) => r.rate > r.benchmark).length;
  const avgHand =
    handHygiene.length > 0
      ? handHygiene.reduce((s, r) => s + r.rate, 0) / handHygiene.length
      : 0;
  const mdrTotal = mdr.reduce((s, r) => s + r.detected, 0);
  const openEvents = events.filter((e) => e.status === 'open' || e.status === 'acknowledged').length;

  return (
    <PageContainer
      title="院感与患者安全看板"
      description="院感千日发生率 / 手卫生依从 / MDRO / 患者安全事件闭环"
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
          message="当前展示为 DEMO 兜底数据（BFF /infection/* 与 /patient-safety/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={6}>
          <Card style={{ borderTop: `3px solid ${haiOver > 0 ? JL.bad : JL.ok}` }}>
            <Statistic
              title="院感超标部位数"
              value={haiOver}
              suffix={`/ ${hai.length}`}
              valueStyle={{ color: haiOver > 0 ? JL.bad : JL.ok }}
            />
          </Card>
        </Col>
        <Col xs={6}>
          <Card style={{ borderTop: `3px solid ${avgHand >= 90 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="手卫生平均依从率"
              value={avgHand}
              precision={1}
              suffix="%"
              valueStyle={{ color: avgHand >= 90 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic title="MDRO 检出例数" value={mdrTotal} valueStyle={{ color: JL.blue }} />
          </Card>
        </Col>
        <Col xs={6}>
          <Card style={{ borderTop: `3px solid ${openEvents > 0 ? JL.bad : JL.ok}` }}>
            <Statistic
              title="未闭环安全事件"
              value={openEvents}
              suffix={`/ ${events.length}`}
              valueStyle={{ color: openEvents > 0 ? JL.bad : JL.ok }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>院感部位千日发生率（VAP/CLABSI/CAUTI/SSI）</span>}
            style={{ borderTop: `3px solid ${JL.navy}`, marginBottom: 16 }}
          >
            <Table
              rowKey="id"
              columns={HAI_COLUMNS}
              dataSource={hai}
              pagination={false}
              size="middle"
            />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>手卫生依从率（科室）</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table
              rowKey="id"
              columns={HAND_COLUMNS}
              dataSource={handHygiene}
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>多重耐药菌（MDRO）检出</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table
              rowKey="id"
              columns={MDR_COLUMNS}
              dataSource={mdr}
              pagination={false}
              size="middle"
            />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>患者安全事件闭环</span>}
            style={{ borderTop: `3px solid ${JL.bad}` }}
          >
            <Table
              rowKey="id"
              columns={EVENT_COLUMNS}
              dataSource={events}
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
