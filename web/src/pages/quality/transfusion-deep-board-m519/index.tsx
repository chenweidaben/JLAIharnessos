/**
 * 健澜科技 jlmedaios - 输血质控深度监控看板（M519）
 * 路由：/quality/transfusion-deep-board
 * 顶部 KPI：今日申请例数 / 不良反应总数 / 严重反应数 / 已解决率
 * 输血申请 / 不良反应
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { ApplicationRow, ReactionRow } from '@/services/api/transfusionDeepBoard';
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
  A: { color: 'blue', label: 'A 型' },
  B: { color: 'orange', label: 'B 型' },
  O: { color: 'green', label: 'O 型' },
  AB: { color: 'purple', label: 'AB 型' },
};

const RH: Record<string, { color: string; label: string }> = {
  positive: { color: 'green', label: 'Rh+' },
  negative: { color: 'red', label: 'Rh-' },
};

const COMPONENT: Record<string, { color: string; label: string }> = {
  RBC: { color: 'blue', label: 'RBC' },
  plasma: { color: 'orange', label: '血浆' },
  platelet: { color: 'green', label: '血小板' },
  wholeBlood: { color: 'purple', label: '全血' },
};

const REACTION: Record<string, { color: string; label: string }> = {
  fever: { color: 'gold', label: '发热' },
  allergy: { color: 'orange', label: '过敏' },
  hemolysis: { color: 'red', label: '溶血' },
  bacterial: { color: 'purple', label: '细菌污染' },
};

const SEVERITY: Record<string, { color: string; label: string }> = {
  mild: { color: 'green', label: '轻度' },
  moderate: { color: 'orange', label: '中度' },
  severe: { color: 'red', label: '重度' },
};

const APP_COLUMNS: ColumnsType<ApplicationRow> = [
  { title: '患者', dataIndex: 'patient', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '血型',
    dataIndex: 'bloodType',
    render: (v: string) => {
      const m = BLOOD_TYPE[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  {
    title: 'Rh',
    dataIndex: 'rh',
    render: (v: string) => {
      const m = RH[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  {
    title: '成分',
    dataIndex: 'component',
    render: (v: string) => {
      const m = COMPONENT[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '申请科室', dataIndex: 'dept', render: (v: string) => <Tag color="cyan">{v}</Tag> },
  { title: '用量', dataIndex: 'amount' },
  { title: '诊断', dataIndex: 'diagnosis' },
];

const REACTION_COLUMNS: ColumnsType<ReactionRow> = [
  { title: '患者', dataIndex: 'patient', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '反应类型',
    dataIndex: 'reactionType',
    render: (v: string) => {
      const m = REACTION[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '发生时间', dataIndex: 'occurredAt' },
  {
    title: '严重程度',
    dataIndex: 'severity',
    render: (v: string) => {
      const m = SEVERITY[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '处理措施', dataIndex: 'treatment' },
  {
    title: '是否已解决',
    dataIndex: 'resolved',
    render: (v: boolean) => (v ? <Tag color="green">已解决</Tag> : <Tag color="red">未解决</Tag>),
  },
];

export default function TransfusionDeepBoardM519Page() {
  usePageTitle('输血质控深度监控看板');
  const { applications, reactions, loading, error, demo, load } = useTransfusionDeepBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpi = useMemo(() => {
    const severe = reactions.filter((r) => r.severity === 'severe').length;
    const resolved = reactions.filter((r) => r.resolved).length;
    const resolvedRate = reactions.length ? (resolved / reactions.length) * 100 : 0;
    return { severe, resolvedRate };
  }, [reactions]);

  if (loading && applications.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载输血看板…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="输血质控深度监控看板（医疗质量安全 P0）"
      description="申请 / 不良反应 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /transfusion/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="今日输血申请"
              value={applications.length}
              suffix="例"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.bad}` }}>
            <Statistic
              title="不良反应总数"
              value={reactions.length}
              suffix="例"
              valueStyle={{ color: JL.bad }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.warn}` }}>
            <Statistic
              title="严重反应数"
              value={kpi.severe}
              suffix="例"
              valueStyle={{ color: JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.ok}` }}>
            <Statistic
              title="已解决率"
              value={kpi.resolvedRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: JL.ok }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={<span style={{ color: JL.navy, fontWeight: 600 }}>输血申请</span>}
        style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
      >
        <Table rowKey="id" columns={APP_COLUMNS} dataSource={applications} pagination={false} size="middle" scroll={{ x: 1100 }} />
      </Card>

      <Card
        title={<span style={{ color: JL.navy, fontWeight: 600 }}>不良反应</span>}
        style={{ borderTop: `3px solid ${JL.bad}` }}
      >
        <Table rowKey="id" columns={REACTION_COLUMNS} dataSource={reactions} pagination={false} size="middle" />
      </Card>
    </PageContainer>
  );
}
