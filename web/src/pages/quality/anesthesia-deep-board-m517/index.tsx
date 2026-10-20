/**
 * 健澜科技 jlmedaios - 手术麻醉深度监控看板（M517）
 * 路由：/quality/anesthesia-deep-board
 * 顶部 KPI：今日麻醉例数 / ASA Ⅲ-Ⅴ 占比 / 术中事件率 / 术后随访完成率
 * 麻醉分级 / 术中安全 / 术后随访
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { FollowupRow, GradingRow, IntraopRow } from '@/services/api/anesthesiaDeepBoard';
import { useAnesthesiaDeepBoardStore } from '@/store/anesthesiaDeepBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const ASA: Record<string, { color: string; label: string }> = {
  I: { color: 'green', label: 'Ⅰ级' },
  II: { color: 'gold', label: 'Ⅱ级' },
  III: { color: 'orange', label: 'Ⅲ级' },
  IV: { color: 'red', label: 'Ⅳ级' },
  V: { color: 'purple', label: 'Ⅴ级' },
};

const METHOD: Record<string, { color: string; label: string }> = {
  general: { color: 'blue', label: '全麻' },
  spinal: { color: 'orange', label: '椎管内' },
  nerveBlock: { color: 'green', label: '神经阻滞' },
  local: { color: 'purple', label: '局麻' },
};

const INTRA_EVENT: Record<string, { color: string; label: string }> = {
  hypotension: { color: 'gold', label: '低血压' },
  hypoxemia: { color: 'orange', label: '低氧血症' },
  arrhythmia: { color: 'red', label: '心律失常' },
  transfusion: { color: 'purple', label: '输血' },
  checkOk: { color: 'green', label: '安全核查' },
};

function vasTag(v: number) {
  if (v <= 3) return <Tag color="green">VAS {v}</Tag>;
  if (v <= 6) return <Tag color="orange">VAS {v}</Tag>;
  return <Tag color="red">VAS {v}</Tag>;
}

const GRADING_COLUMNS: ColumnsType<GradingRow> = [
  { title: '患者', dataIndex: 'patient', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '手术名称', dataIndex: 'surgery' },
  {
    title: 'ASA 分级',
    dataIndex: 'asa',
    render: (v: string) => {
      const m = ASA[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  {
    title: '麻醉方式',
    dataIndex: 'method',
    render: (v: string) => {
      const m = METHOD[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
];

const INTRAOP_COLUMNS: ColumnsType<IntraopRow> = [
  { title: '手术', dataIndex: 'surgery', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '麻醉医师', dataIndex: 'anesthetist' },
  {
    title: '术中事件',
    dataIndex: 'event',
    render: (v: string) => {
      const m = INTRA_EVENT[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '持续时长', dataIndex: 'durationMin', render: (v: number) => `${v} min`, sorter: (a, b) => b.durationMin - a.durationMin },
];

const FOLLOWUP_COLUMNS: ColumnsType<FollowupRow> = [
  { title: '患者', dataIndex: 'patient', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '术后 24h VAS', dataIndex: 'vas', render: (v: number) => vasTag(v), sorter: (a, b) => b.vas - a.vas },
  {
    title: '恶心呕吐',
    dataIndex: 'nauseaVomiting',
    render: (v: boolean) => (v ? <Tag color="red">有</Tag> : <Tag color="green">无</Tag>),
  },
  {
    title: '随访完成',
    dataIndex: 'completed',
    render: (v: boolean) => (v ? <Tag color="green">已完成</Tag> : <Tag color="orange">未完成</Tag>),
  },
];

export default function AnesthesiaDeepBoardM517Page() {
  usePageTitle('手术麻醉深度监控看板');
  const { grading, intraop, followup, loading, error, demo, load } = useAnesthesiaDeepBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpi = useMemo(() => {
    const asaHigh = grading.filter((g) => g.asa === 'III' || g.asa === 'IV' || g.asa === 'V').length;
    const asaHighRate = grading.length ? (asaHigh / grading.length) * 100 : 0;
    const eventCount = intraop.filter((i) => i.event !== 'checkOk').length;
    const eventRate = intraop.length ? (eventCount / intraop.length) * 100 : 0;
    const followupDone = followup.filter((f) => f.completed).length;
    const followupRate = followup.length ? (followupDone / followup.length) * 100 : 0;
    return { asaHighRate, eventRate, followupRate };
  }, [grading, intraop, followup]);

  if (loading && grading.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载麻醉看板…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="手术麻醉深度监控看板（医疗质量安全 P0）"
      description="麻醉分级 / 术中安全 / 术后随访 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /anesthesia/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="今日麻醉例数"
              value={grading.length}
              suffix="例"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.warn}` }}>
            <Statistic
              title="ASA Ⅲ-Ⅴ 级占比"
              value={kpi.asaHighRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.bad}` }}>
            <Statistic
              title="术中事件率"
              value={kpi.eventRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: JL.bad }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.ok}` }}>
            <Statistic
              title="术后随访完成率"
              value={kpi.followupRate}
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
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>麻醉分级</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={GRADING_COLUMNS} dataSource={grading} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>术中安全</span>}
            style={{ borderTop: `3px solid ${JL.bad}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={INTRAOP_COLUMNS} dataSource={intraop} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>

      <Card
        title={<span style={{ color: JL.navy, fontWeight: 600 }}>术后随访</span>}
        style={{ borderTop: `3px solid ${JL.ok}` }}
      >
        <Table rowKey="id" columns={FOLLOWUP_COLUMNS} dataSource={followup} pagination={false} size="middle" />
      </Card>
    </PageContainer>
  );
}
