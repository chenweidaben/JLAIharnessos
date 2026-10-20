/**
 * 健澜科技 jlmedaios - 输血质控深度监控看板（M519，生产级）
 * 路由：/quality/transfusion-deep-board
 * 业务闭环：申请→审批→交叉配血→发血→床旁双人核对→输注开始/结束→不良反应→上报
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Table, Tag, Typography, Select, Progress } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { ApplicationRow, ReactionRow, TxStatus } from '@/services/api/transfusionDeepBoard';
import { useTransfusionDeepBoardStore } from '@/store/transfusionDeepBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const BLOOD_TYPE: Record<string, { color: string; label: string }> = {
  A: { color: 'blue', label: 'A' },
  B: { color: 'orange', label: 'B' },
  O: { color: 'green', label: 'O' },
  AB: { color: 'purple', label: 'AB' },
};

const COMPONENT: Record<string, { color: string; label: string }> = {
  RBC: { color: 'blue', label: '红细胞' },
  plasma: { color: 'orange', label: '血浆' },
  platelet: { color: 'green', label: '血小板' },
  cryoprecipitate: { color: 'cyan', label: '冷沉淀' },
};

const TX_STATUS: Record<TxStatus, { color: string; label: string }> = {
  draft: { color: 'default', label: '待审批' },
  approved: { color: 'blue', label: '已审批' },
  issued: { color: 'orange', label: '已发血' },
  transfusing: { color: 'processing', label: '输注中' },
  completed: { color: 'success', label: '已完成' },
  returned: { color: 'error', label: '已退回' },
};

const XMATCH: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '待配血' },
  matched: { color: 'green', label: '相合' },
  mismatch: { color: 'red', label: '不相合' },
};

const REACTION: Record<string, { color: string; label: string }> = {
  fever: { color: 'gold', label: '发热' },
  allergy: { color: 'orange', label: '过敏' },
  hemolysis: { color: 'red', label: '溶血' },
  bacterial: { color: 'purple', label: '细菌污染' },
  circulatoryOverload: { color: 'magenta', label: '循环超负荷' },
  hypocalcemia: { color: 'cyan', label: '低钙' },
};

const SEVERITY: Record<string, { color: string; label: string }> = {
  mild: { color: 'green', label: '轻度' },
  moderate: { color: 'orange', label: '中度' },
  severe: { color: 'red', label: '重度' },
};

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const APP_COLUMNS: ColumnsType<ApplicationRow> = [
  { title: '申请号', dataIndex: 'id', width: 160, render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
  { title: '患者', dataIndex: 'patient', width: 80, render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '血型',
    dataIndex: 'bloodType',
    width: 80,
    render: (v: string, r) => (
      <span>
        <Tag color={BLOOD_TYPE[v]?.color}>{BLOOD_TYPE[v]?.label ?? v}</Tag>
        <Tag color={r.rh === 'negative' ? 'red' : 'default'}>{r.rh === 'negative' ? 'Rh-' : 'Rh+'}</Tag>
      </span>
    ),
  },
  { title: '成分', dataIndex: 'component', width: 90, render: (v: string) => <Tag color={COMPONENT[v]?.color}>{COMPONENT[v]?.label ?? v}</Tag> },
  { title: '用量', dataIndex: 'amountMl', width: 80, render: (v: number) => `${v} ml` },
  {
    title: '术前化验',
    width: 140,
    render: (_: unknown, r) => (
      <Text style={{ fontSize: 12 }}>
        Hb {r.preHb ?? '—'} / Plt {r.prePlt ?? '—'} / INR {r.preINR ?? '—'}
      </Text>
    ),
  },
  { title: '申请科室', dataIndex: 'dept', width: 110, render: (v: string) => <Tag color="cyan">{v}</Tag> },
  { title: '诊断', dataIndex: 'diagnosis', ellipsis: true },
  {
    title: '配血',
    dataIndex: 'crossmatchStatus',
    width: 90,
    render: (v: string) => <Tag color={XMATCH[v]?.color}>{XMATCH[v]?.label ?? v}</Tag>,
  },
  {
    title: '流程状态',
    dataIndex: 'status',
    width: 100,
    render: (v: TxStatus) => <Tag color={TX_STATUS[v].color}>{TX_STATUS[v].label}</Tag>,
  },
  {
    title: '双人核对',
    dataIndex: 'nurseDoubleCheck',
    width: 90,
    render: (v: boolean) => (v ? <Tag color="green">已核对</Tag> : <Tag color="orange">待核对</Tag>),
  },
  {
    title: '时间链',
    width: 200,
    render: (_: unknown, r) => (
      <Text style={{ fontSize: 11, color: '#666' }}>
        发 {fmtTime(r.issuedAt)}<br />
        输 {fmtTime(r.transfusedAt)}<br />
        完 {fmtTime(r.completedAt)}
      </Text>
    ),
  },
];

const REACTION_COLUMNS: ColumnsType<ReactionRow> = [
  { title: '事件号', dataIndex: 'id', width: 170, render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
  { title: '患者', dataIndex: 'patient', width: 80, render: (v: string) => <Text strong>{v}</Text> },
  { title: '反应类型', dataIndex: 'reactionType', width: 100, render: (v: string) => <Tag color={REACTION[v]?.color}>{REACTION[v]?.label ?? v}</Tag> },
  { title: '严重度', dataIndex: 'severity', width: 80, render: (v: string) => <Tag color={SEVERITY[v]?.color}>{SEVERITY[v]?.label ?? v}</Tag> },
  { title: '血制品/批号', width: 180, render: (_: unknown, r) => <Text style={{ fontSize: 12 }}>{r.bloodProduct}<br /><Text code style={{ fontSize: 11 }}>{r.lotNumber}</Text></Text> },
  { title: '发生时间', dataIndex: 'occurredAt', width: 140, render: (v: string) => fmtTime(v) },
  { title: '处理措施', dataIndex: 'treatment', ellipsis: true },
  {
    title: '上报',
    dataIndex: 'reportRequired',
    width: 90,
    render: (v: boolean) => (v ? <Tag color="red">需上报卫健委</Tag> : <Tag>内部记录</Tag>),
  },
  {
    title: '处置',
    dataIndex: 'resolved',
    width: 100,
    render: (v: boolean) => (v ? <Tag color="green">已处置</Tag> : <Tag color="red">处置中</Tag>),
  },
];

export default function TransfusionDeepBoardM519Page() {
  usePageTitle('输血质控深度监控');
  const { applications, reactions, stats, loading, error, demo, load } = useTransfusionDeepBoardStore();
  const [statusFilter, setStatusFilter] = useState<TxStatus | 'all'>('all');

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () => (statusFilter === 'all' ? applications : applications.filter((a) => a.status === statusFilter)),
    [applications, statusFilter],
  );

  if (loading && applications.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载输血质控看板…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="输血质控深度监控（医疗质量安全 P0）"
      description="申请全流程 · 配血 · 发血 · 双人核对 · 不良反应闭环"
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>
          刷新
        </Button>
      }
    >
      {error && <Alert type="warning" showIcon style={{ marginBottom: 16 }} message={error} />}
      {demo && (
        <Alert type="info" showIcon style={{ marginBottom: 16 }} message="当前为 DEMO 兜底数据（BFF 接入后自动切换真实数据）" />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={3}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic title="今日申请" value={stats?.todayApplications ?? applications.length} suffix="例" valueStyle={{ color: JL.blue }} />
          </Card>
        </Col>
        <Col xs={12} lg={3}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic title="今日已输" value={stats?.todayTransfused ?? 0} suffix="例" valueStyle={{ color: JL.accent }} />
          </Card>
        </Col>
        <Col xs={12} lg={3}>
          <Card style={{ borderTop: `3px solid ${JL.bad}` }}>
            <Statistic title="本月不良反应" value={stats?.monthReactions ?? reactions.length} suffix="例" valueStyle={{ color: JL.bad }} />
          </Card>
        </Col>
        <Col xs={12} lg={3}>
          <Card style={{ borderTop: `3px solid ${JL.warn}` }}>
            <Statistic title="严重反应率" value={((stats?.severeReactionRate ?? 0) * 100).toFixed(1)} suffix="%" valueStyle={{ color: JL.warn }} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card title={<Text strong style={{ color: JL.navy, fontSize: 13 }}>配血相合率 / 按时发血率 / 双人核对合规率</Text>}>
            <Progress percent={stats?.matchRate ?? 100} size="small" strokeColor={JL.ok} format={(v) => `配血 ${v}%`} />
            <Progress percent={stats?.onTimeRate ?? 100} size="small" strokeColor={JL.blue} format={(v) => `按时 ${v}%`} />
            <Progress percent={stats?.doubleCheckCompliance ?? 100} size="small" strokeColor={JL.accent} format={(v) => `核对 ${v}%`} />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <span style={{ color: JL.navy, fontWeight: 600 }}>
            输血申请全流程
            <Select
              size="small"
              style={{ width: 120, marginLeft: 12 }}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              options={[
                { value: 'all', label: '全部状态' },
                { value: 'draft', label: '待审批' },
                { value: 'approved', label: '已审批' },
                { value: 'issued', label: '已发血' },
                { value: 'transfusing', label: '输注中' },
                { value: 'completed', label: '已完成' },
                { value: 'returned', label: '已退回' },
              ]}
            />
          </span>
        }
        style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
      >
        <Table rowKey="id" columns={APP_COLUMNS} dataSource={filtered} pagination={false} size="small" scroll={{ x: 1400 }} />
      </Card>

      <Card
        title={<span style={{ color: JL.navy, fontWeight: 600 }}>输血不良反应事件（含需上报卫健委）</span>}
        style={{ borderTop: `3px solid ${JL.bad}` }}
      >
        <Table rowKey="id" columns={REACTION_COLUMNS} dataSource={reactions} pagination={false} size="small" scroll={{ x: 1200 }} />
      </Card>
    </PageContainer>
  );
}
