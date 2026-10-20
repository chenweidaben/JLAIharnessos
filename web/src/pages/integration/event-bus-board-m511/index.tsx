/**
 * 健澜科技 jlmedaios - 事件总线监控看板（M511）
 * 路由：/integration/event-bus-board
 * 顶部 KPI：今日事件总量 / 投递成功率 / 死信率 / 平均延迟
 * 事件列表 / 消费者组
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { ConsumerRow, EventRow } from '@/services/api/eventBusBoard';
import { useEventBusBoardStore } from '@/store/eventBusBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const EVENT_TYPE: Record<string, { color: string; label: string }> = {
  'patient.created': { color: 'blue', label: 'patient.created' },
  'order.placed': { color: 'orange', label: 'order.placed' },
  'lab.result': { color: 'green', label: 'lab.result' },
  'critical.alert': { color: 'red', label: 'critical.alert' },
  'consent.updated': { color: 'purple', label: 'consent.updated' },
};

const EVENT_STATUS: Record<string, { color: string; label: string }> = {
  pending: { color: 'gold', label: 'pending' },
  delivered: { color: 'green', label: 'delivered' },
  failed: { color: 'red', label: 'failed' },
  'dead-letter': { color: 'default', label: 'dead-letter' },
};

function lagTag(lag: number) {
  if (lag < 1) return <Tag color="green">&lt;1s</Tag>;
  if (lag <= 5) return <Tag color="orange">1-5s</Tag>;
  return <Tag color="red">&gt;5s</Tag>;
}

const EVENT_COLUMNS: ColumnsType<EventRow> = [
  {
    title: '事件类型',
    dataIndex: 'type',
    render: (v: string) => {
      const m = EVENT_TYPE[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '事件 ID', dataIndex: 'eventId', render: (v: string) => <Text code style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '状态',
    dataIndex: 'status',
    render: (v: string) => {
      const m = EVENT_STATUS[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '时间', dataIndex: 'timestamp' },
];

const CONSUMER_COLUMNS: ColumnsType<ConsumerRow> = [
  { title: '消费者名', dataIndex: 'name', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '订阅主题', dataIndex: 'topic', render: (v: string) => <Tag color="blue">{v}</Tag> },
  { title: '消费延迟', dataIndex: 'lag', render: (v: number) => lagTag(v), sorter: (a, b) => b.lag - a.lag },
  { title: '积压消息数', dataIndex: 'backlog', render: (v: number) => (v > 20 ? <Tag color="red">{v}</Tag> : v > 0 ? <Tag color="orange">{v}</Tag> : <Tag color="green">0</Tag>) },
];

export default function EventBusBoardM511Page() {
  usePageTitle('事件总线监控看板');
  const { events, consumers, stats, loading, error, demo, load } = useEventBusBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && events.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载事件总线看板…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="事件总线监控看板（互联互通四甲 P0）"
      description="事件列表 / 消费者组 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /eventbus/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="今日事件总量"
              value={stats?.totalToday ?? 0}
              suffix="条"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.ok}` }}>
            <Statistic
              title="投递成功率"
              value={stats?.deliveryRate ?? 0}
              precision={2}
              suffix="%"
              valueStyle={{ color: JL.ok }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.bad}` }}>
            <Statistic
              title="死信率"
              value={stats?.deadLetterRate ?? 0}
              precision={3}
              suffix="%"
              valueStyle={{ color: JL.bad }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.warn}` }}>
            <Statistic
              title="平均延迟"
              value={stats?.avgLatencyMs ?? 0}
              suffix="ms"
              valueStyle={{ color: JL.warn }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>事件列表</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={EVENT_COLUMNS} dataSource={events} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>消费者组</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table rowKey="id" columns={CONSUMER_COLUMNS} dataSource={consumers} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
