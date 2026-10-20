/**
 * 健澜科技 jlmedaios - 医保智能审核深度监控看板（M513）
 * 路由：/finance/insurance-deep-board
 * 顶部 KPI：本月结算总额 / DRG 入组率 / 拒付率 / 违规命中数
 * 医保规则审核 / 拒付分析
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { AuditRuleRow, DenialRow } from '@/services/api/insuranceDeepBoard';
import { useInsuranceDeepBoardStore } from '@/store/insuranceDeepBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const RULE_CATEGORY: Record<string, { color: string; label: string }> = {
  indicationMismatch: { color: 'orange', label: '适应症不符' },
  beyondLimit: { color: 'red', label: '超限定支付' },
  duplicateCharge: { color: 'purple', label: '重复收费' },
  overdose: { color: 'blue', label: '超量开药' },
  swapItem: { color: 'green', label: '串换项目' },
};

const SEVERITY: Record<string, { color: string; label: string }> = {
  high: { color: 'red', label: '高' },
  medium: { color: 'orange', label: '中' },
  low: { color: 'gold', label: '低' },
};

const DENIAL_REASON: Record<string, { color: string; label: string }> = {
  incompleteDoc: { color: 'gold', label: '资料不全' },
  outCatalog: { color: 'orange', label: '超目录' },
  overLimit: { color: 'red', label: '超限用药' },
  repeatAdmit: { color: 'purple', label: '重复住院' },
};

const RULE_COLUMNS: ColumnsType<AuditRuleRow> = [
  { title: '规则名称', dataIndex: 'name', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '违规类型',
    dataIndex: 'category',
    render: (v: string) => {
      const m = RULE_CATEGORY[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  {
    title: '违规等级',
    dataIndex: 'severity',
    render: (v: string) => {
      const m = SEVERITY[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '命中次数', dataIndex: 'hits', sorter: (a, b) => b.hits - a.hits },
];

const DENIAL_COLUMNS: ColumnsType<DenialRow> = [
  {
    title: '拒付原因',
    dataIndex: 'reason',
    render: (v: string) => {
      const m = DENIAL_REASON[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '结算周期', dataIndex: 'period' },
  {
    title: '拒付金额',
    dataIndex: 'amount',
    render: (v: number) => <Text strong style={{ color: JL.bad }}>¥ {v.toLocaleString()}</Text>,
    sorter: (a, b) => b.amount - a.amount,
  },
];

export default function InsuranceDeepBoardM513Page() {
  usePageTitle('医保智能审核深度监控看板');
  const { rules, denials, stats, loading, error, demo, load } = useInsuranceDeepBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && rules.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载医保审核看板…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="医保智能审核深度监控看板（智慧服务三级 P0）"
      description="规则审核 / 拒付分析 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /insurance/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="本月结算总额"
              value={stats?.monthlyTotal ?? 0}
              precision={0}
              prefix="¥"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic
              title="DRG 入组率"
              value={stats?.drgGroupRate ?? 0}
              precision={1}
              suffix="%"
              valueStyle={{ color: JL.accent }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.bad}` }}>
            <Statistic
              title="拒付率"
              value={stats?.denialRate ?? 0}
              precision={2}
              suffix="%"
              valueStyle={{ color: JL.bad }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.warn}` }}>
            <Statistic
              title="违规命中数"
              value={stats?.violationHits ?? rules.reduce((a, r) => a + r.hits, 0)}
              suffix="次"
              valueStyle={{ color: JL.warn }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>医保规则审核</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={RULE_COLUMNS} dataSource={rules} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>拒付分析</span>}
            style={{ borderTop: `3px solid ${JL.bad}` }}
          >
            <Table rowKey="id" columns={DENIAL_COLUMNS} dataSource={denials} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
