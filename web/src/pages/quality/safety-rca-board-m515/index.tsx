/**
 * 健澜科技 jlmedaios - 患者安全事件与 RCA 根因分析看板（M515）
 * 路由：/quality/safety-rca-board
 * 顶部 KPI：本月安全事件 / RCA 完成率 / 整改完成率 / 逾期整改数
 * 事件 / RCA 根因 / 整改追踪
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { RcaRow, RectificationRow, SafetyEventRow } from '@/services/api/safetyRcaBoard';
import { useSafetyRcaBoardStore } from '@/store/safetyRcaBoardStore';

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
  fall: { color: 'orange', label: '跌倒' },
  pressureUlcer: { color: 'red', label: '压疮' },
  medError: { color: 'purple', label: '用药错误' },
  tubeDisplacement: { color: 'blue', label: '管路滑脱' },
  fallBed: { color: 'green', label: '跌倒坠床' },
};

const SEVERITY: Record<string, { color: string; label: string }> = {
  level1: { color: 'gold', label: 'Ⅰ级' },
  level2: { color: 'orange', label: 'Ⅱ级' },
  level3: { color: 'red', label: 'Ⅲ级' },
  level4: { color: 'volcano', label: 'Ⅳ级' },
};

const RCA_STATUS: Record<string, { color: string; label: string }> = {
  pending: { color: 'blue', label: '待分析' },
  analyzing: { color: 'orange', label: '分析中' },
  completed: { color: 'green', label: '已完成' },
};

const ROOT_CAUSE: Record<string, { color: string; label: string }> = {
  man: { color: 'blue', label: '人' },
  machine: { color: 'orange', label: '机' },
  material: { color: 'green', label: '料' },
  method: { color: 'purple', label: '法' },
  environment: { color: 'red', label: '环' },
};

const RECT_STATUS: Record<string, { color: string; label: string }> = {
  ongoing: { color: 'blue', label: '进行中' },
  completed: { color: 'green', label: '已完成' },
  overdue: { color: 'red', label: '已逾期' },
};

function rateTag(r: number) {
  if (r >= 95) return <Tag color="green">{r.toFixed(1)}%</Tag>;
  if (r >= 85) return <Tag color="orange">{r.toFixed(1)}%</Tag>;
  return <Tag color="red">{r.toFixed(1)}%</Tag>;
}

const EVENT_COLUMNS: ColumnsType<SafetyEventRow> = [
  {
    title: '事件类型',
    dataIndex: 'type',
    render: (v: string) => {
      const m = EVENT_TYPE[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  {
    title: '严重程度',
    dataIndex: 'severity',
    render: (v: string) => {
      const m = SEVERITY[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '发生科室', dataIndex: 'dept', render: (v: string) => <Tag color="blue">{v}</Tag> },
  { title: '上报时间', dataIndex: 'reportedAt' },
];

const RCA_COLUMNS: ColumnsType<RcaRow> = [
  { title: '事件编号', dataIndex: 'eventNo', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '分析状态',
    dataIndex: 'status',
    render: (v: string) => {
      const m = RCA_STATUS[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  {
    title: '根本原因',
    dataIndex: 'rootCause',
    render: (v: string) => {
      const m = ROOT_CAUSE[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '整改措施数', dataIndex: 'rectificationCount' },
];

const RECT_COLUMNS: ColumnsType<RectificationRow> = [
  { title: '整改措施', dataIndex: 'measure', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '责任科室', dataIndex: 'dept', render: (v: string) => <Tag color="blue">{v}</Tag> },
  {
    title: '完成时限',
    dataIndex: 'status',
    render: (v: string) => {
      const m = RECT_STATUS[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  {
    title: '完成率',
    dataIndex: 'completeRate',
    render: (v: number) => rateTag(v),
    sorter: (a, b) => b.completeRate - a.completeRate,
  },
];

export default function SafetyRcaBoardM515Page() {
  usePageTitle('患者安全事件与 RCA 根因分析看板');
  const { events, rcas, rectifications, stats, loading, error, demo, load } = useSafetyRcaBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && events.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载安全事件看板…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="患者安全事件与 RCA 根因分析看板（医疗质量安全 P0）"
      description="事件 / RCA / 整改追踪 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /safety/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="本月安全事件"
              value={stats?.monthlyEvents ?? events.length}
              suffix="件"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic
              title="RCA 完成率"
              value={stats?.rcaCompletionRate ?? 0}
              precision={1}
              suffix="%"
              valueStyle={{ color: JL.accent }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.ok}` }}>
            <Statistic
              title="整改完成率"
              value={stats?.rectificationCompletionRate ?? 0}
              precision={1}
              suffix="%"
              valueStyle={{ color: JL.ok }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.bad}` }}>
            <Statistic
              title="逾期整改"
              value={stats?.overdueRectification ?? 0}
              suffix="件"
              valueStyle={{ color: JL.bad }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>安全事件</span>}
            style={{ borderTop: `3px solid ${JL.bad}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={EVENT_COLUMNS} dataSource={events} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>RCA 根因</span>}
            style={{ borderTop: `3px solid ${JL.accent}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={RCA_COLUMNS} dataSource={rcas} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>

      <Card
        title={<span style={{ color: JL.navy, fontWeight: 600 }}>整改追踪</span>}
        style={{ borderTop: `3px solid ${JL.ok}` }}
      >
        <Table rowKey="id" columns={RECT_COLUMNS} dataSource={rectifications} pagination={false} size="middle" />
      </Card>
    </PageContainer>
  );
}
