/**
 * 健澜科技 jlmedaios - 门诊一站式服务看板（M505）
 * 路由：/outpatient/one-stop-board
 * 顶部 KPI：今日一站式服务总量 / 平均办理时长 / 窗口开放率 / 一站式满意度
 * 服务事项 / 窗口状态
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { CounterRow, ServiceRow } from '@/services/api/oneStopBoard';
import { useOneStopBoardStore } from '@/store/oneStopBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const CATEGORY_META: Record<string, { color: string; label: string }> = {
  consult: { color: 'blue', label: '咨询' },
  guide: { color: 'green', label: '导诊' },
  stamp: { color: 'orange', label: '盖章' },
  refund: { color: 'red', label: '退费' },
  copy: { color: 'purple', label: '复印' },
  insurance: { color: 'cyan', label: '医保' },
};

const COUNTER_STATUS: Record<string, { color: string; label: string }> = {
  open: { color: 'green', label: '开放' },
  busy: { color: 'orange', label: '繁忙' },
  closed: { color: 'red', label: '暂停' },
  serving: { color: 'blue', label: '办理中' },
};

const SERVICE_COLUMNS: ColumnsType<ServiceRow> = [
  { title: '事项名称', dataIndex: 'name', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '类别',
    dataIndex: 'category',
    render: (v: string) => {
      const m = CATEGORY_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '服务窗口', dataIndex: 'counter' },
  {
    title: '平均办理时长(分钟)',
    dataIndex: 'avgMinutes',
    render: (v: number) => (
      <Text style={{ color: v <= 5 ? JL.ok : v <= 10 ? JL.warn : JL.bad, fontWeight: 600 }}>{v}</Text>
    ),
    sorter: (a, b) => b.avgMinutes - a.avgMinutes,
  },
];

const COUNTER_COLUMNS: ColumnsType<CounterRow> = [
  { title: '窗口编号', dataIndex: 'no', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '服务事项', dataIndex: 'service' },
  {
    title: '状态',
    dataIndex: 'status',
    render: (v: string) => {
      const m = COUNTER_STATUS[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  {
    title: '排队人数',
    dataIndex: 'queue',
    render: (v: number) => (v > 5 ? <Tag color="red">{v}</Tag> : v > 0 ? <Tag color="orange">{v}</Tag> : <Tag color="green">0</Tag>),
    sorter: (a, b) => b.queue - a.queue,
  },
];

export default function OneStopBoardM505Page() {
  usePageTitle('门诊一站式服务看板');
  const { services, counters, stats, loading, error, demo, load } = useOneStopBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && services.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载一站式看板…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="门诊一站式服务看板（智慧服务三级 P0 合规重点）"
      description="服务事项 / 窗口状态 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /one-stop/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="今日一站式服务"
              value={stats?.todayCount ?? 0}
              suffix="人次"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic
              title="平均办理时长"
              value={stats?.avgMinutes ?? 0}
              precision={1}
              suffix="分钟"
              valueStyle={{ color: JL.accent }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${(stats?.openRate ?? 0) >= 90 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="窗口开放率"
              value={stats?.openRate ?? 0}
              precision={1}
              suffix="%"
              valueStyle={{ color: (stats?.openRate ?? 0) >= 90 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.ok}` }}>
            <Statistic
              title="一站式满意度"
              value={stats?.satisfaction ?? 0}
              precision={1}
              suffix="%"
              valueStyle={{ color: JL.ok }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>服务事项</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={SERVICE_COLUMNS} dataSource={services} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>窗口状态</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table rowKey="id" columns={COUNTER_COLUMNS} dataSource={counters} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
