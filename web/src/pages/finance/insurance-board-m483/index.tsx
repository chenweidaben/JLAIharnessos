/**
 * 健澜科技 jlmedaios - 医保与应急管理看板（M483）
 * 路由：/finance/insurance-board
 * 顶部 KPI + 医保审核 + DRG/DIP + 拒付 + 应急预案 + 应急物资
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9；超支/拒付 #D9534F、结余 #52C41A
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type {
  DipSettlementRow,
  DrgSettlementRow,
  EmergencyPlanRow,
  EmergencySupplyRow,
  ExpenseAuditRow,
  RejectionRow,
} from '@/services/api/insuranceBoard';
import { useInsuranceBoardStore } from '@/store/insuranceBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const AUDIT_STATUS: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待复核' },
  confirmed: { color: 'red', label: '已确认' },
  rectified: { color: 'green', label: '已整改' },
  appealed: { color: 'blue', label: '已申诉' },
};

const APPEAL_STATUS: Record<string, { color: string; label: string }> = {
  open: { color: 'red', label: '未申诉' },
  appealing: { color: 'orange', label: '申诉中' },
  won: { color: 'green', label: '申诉成功' },
  lost: { color: 'default', label: '申诉失败' },
};

const PLAN_STATUS: Record<string, { color: string; label: string }> = {
  ready: { color: 'green', label: '就绪' },
  due: { color: 'orange', label: '到期演练' },
  expired: { color: 'red', label: '已过期' },
};

const AUDIT_COLUMNS: ColumnsType<ExpenseAuditRow> = [
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '不合理条目', dataIndex: 'item' },
  { title: '金额(元)', dataIndex: 'amount', render: (v: number) => `¥${v.toLocaleString()}`, sorter: (a, b) => b.amount - a.amount },
  {
    title: '审核状态',
    dataIndex: 'status',
    render: (v: string) => {
      const m = AUDIT_STATUS[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
];

const DRG_COLUMNS: ColumnsType<DrgSettlementRow> = [
  { title: '病组', dataIndex: 'group', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '病例数', dataIndex: 'cases', sorter: (a, b) => b.cases - a.cases },
  {
    title: '结算率',
    dataIndex: 'rate',
    render: (v: number) => (
      <Progress
        percent={v}
        size="small"
        style={{ width: 140 }}
        strokeColor={v >= 90 ? JL.ok : v >= 85 ? JL.warn : JL.bad}
      />
    ),
    sorter: (a, b) => b.rate - a.rate,
  },
  {
    title: '费用偏差',
    dataIndex: 'variance',
    render: (v: number) => (
      <Tag color={v >= 0 ? 'green' : 'red'}>
        {v >= 0 ? '结余 ' : '超支 '}
        {Math.abs(v).toFixed(1)}%
      </Tag>
    ),
  },
];

const DIP_COLUMNS: ColumnsType<DipSettlementRow> = [
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '总分值', dataIndex: 'totalPoints', sorter: (a, b) => b.totalPoints - a.totalPoints },
  { title: '分值单价(元)', dataIndex: 'unitPrice' },
  { title: '结算额(元)', dataIndex: 'settlement', render: (v: number) => `¥${v.toLocaleString()}` },
];

const REJECT_COLUMNS: ColumnsType<RejectionRow> = [
  { title: '拒付原因', dataIndex: 'reason' },
  { title: '人次', dataIndex: 'visits', sorter: (a, b) => b.visits - a.visits },
  { title: '金额(元)', dataIndex: 'amount', render: (v: number) => `¥${v.toLocaleString()}`, sorter: (a, b) => b.amount - a.amount },
  {
    title: '申诉状态',
    dataIndex: 'appealStatus',
    render: (v: string) => {
      const m = APPEAL_STATUS[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
];

const PLAN_COLUMNS: ColumnsType<EmergencyPlanRow> = [
  { title: '预案', dataIndex: 'plan', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '响应级别', dataIndex: 'level', render: (v: string) => <Tag color="purple">{v} 级</Tag> },
  { title: '上次演练', dataIndex: 'lastDrill' },
  { title: '下次演练', dataIndex: 'nextDrill' },
  {
    title: '状态',
    dataIndex: 'status',
    render: (v: string) => {
      const m = PLAN_STATUS[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
];

const SUPPLY_COLUMNS: ColumnsType<EmergencySupplyRow> = [
  { title: '物资', dataIndex: 'item' },
  { title: '库存', dataIndex: 'stock', render: (v: number, r) => `${v} ${r.unit}` },
  { title: '效期', dataIndex: 'expiry' },
  {
    title: '效期预警',
    dataIndex: 'expiry',
    render: (v: string) => {
      // 2026-10-20 之后 60 天内到期 → 红
      const target = new Date('2026-10-20');
      const exp = new Date(v);
      const days = Math.floor((exp.getTime() - target.getTime()) / 86400000);
      if (days < 0) return <Tag color="red">已过期</Tag>;
      if (days <= 60) return <Tag color="orange">60 天内到期</Tag>;
      return <Tag color="green">正常</Tag>;
    },
  },
];

export default function InsuranceBoardM483Page() {
  usePageTitle('医保与应急管理看板');
  const { audit, drg, dip, rejection, plans, supplies, loading, error, demo, load } =
    useInsuranceBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && audit.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载医保与应急看板…" />
      </div>
    );
  }

  const totalAudit = audit.reduce((s, r) => s + r.amount, 0);
  const avgDrgRate =
    drg.length > 0 ? drg.reduce((s, r) => s + r.rate, 0) / drg.length : 0;
  const avgDipPrice =
    dip.length > 0 ? dip.reduce((s, r) => s + r.unitPrice, 0) / dip.length : 0;
  const totalReject = rejection.reduce((s, r) => s + r.amount, 0);
  const expiredPlans = plans.filter((p) => p.status === 'expired' || p.status === 'due').length;

  return (
    <PageContainer
      title="医保与应急管理看板"
      description="DRG/DIP 结算 / 不合理费用审核 / 拒付申诉 / 应急预案与物资"
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
          message="当前展示为 DEMO 兜底数据（BFF /insurance/* 与 /emergency/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.bad}` }}>
            <Statistic
              title="不合理费用金额"
              value={totalAudit}
              prefix="¥"
              valueStyle={{ color: JL.bad, fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${avgDrgRate >= 90 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="DRG 平均结算率"
              value={avgDrgRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: avgDrgRate >= 90 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="DIP 平均分值单价"
              value={avgDipPrice}
              precision={2}
              prefix="¥"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.bad}` }}>
            <Statistic
              title="拒付总金额"
              value={totalReject}
              prefix="¥"
              valueStyle={{ color: JL.bad, fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>不合理费用审核</span>}
            style={{ borderTop: `3px solid ${JL.bad}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={AUDIT_COLUMNS} dataSource={audit} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>DRG 结算（病组）</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={DRG_COLUMNS} dataSource={drg} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>DIP 结算（科室分值）</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table rowKey="id" columns={DIP_COLUMNS} dataSource={dip} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>医保拒付与申诉</span>}
            style={{ borderTop: `3px solid ${JL.warn}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={REJECT_COLUMNS} dataSource={rejection} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>应急预案（到期 {expiredPlans} 项）</span>}
            style={{ borderTop: `3px solid ${JL.ok}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={PLAN_COLUMNS} dataSource={plans} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>应急物资效期</span>}
            style={{ borderTop: `3px solid ${JL.warn}` }}
          >
            <Table rowKey="id" columns={SUPPLY_COLUMNS} dataSource={supplies} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
