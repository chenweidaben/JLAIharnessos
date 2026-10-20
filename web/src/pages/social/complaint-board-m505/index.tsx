/**
 * 健澜科技 jlmedaios - 医疗投诉处理管理看板（M505）
 * 路由：/social/complaint-board
 * 顶部 KPI：本月投诉量 / 办结率 / 满意率 / 平均处理时长
 * 投诉列表 / 处理记录
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { ComplaintRow, HandleRow } from '@/services/api/complaintBoard';
import { useComplaintBoardStore } from '@/store/complaintBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const TYPE_META: Record<string, { color: string; label: string }> = {
  serviceAttitude: { color: 'orange', label: '服务态度' },
  medicalQuality: { color: 'red', label: '医疗质量' },
  billing: { color: 'blue', label: '收费问题' },
  ethics: { color: 'purple', label: '医德医风' },
  environment: { color: 'green', label: '环境设施' },
};

const STATUS_META: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待受理' },
  processing: { color: 'blue', label: '处理中' },
  resolved: { color: 'green', label: '已办结' },
  unsatisfied: { color: 'red', label: '不满意' },
};

function hoursTag(h: number) {
  if (h <= 24) return <Tag color="green">≤24h</Tag>;
  if (h <= 72) return <Tag color="blue">24-72h</Tag>;
  return <Tag color="red">&gt;72h</Tag>;
}

const RESULT_META: Record<string, { color: string; label: string }> = {
  satisfied: { color: 'green', label: '满意' },
  basic: { color: 'orange', label: '基本满意' },
  unsatisfied: { color: 'red', label: '不满意' },
};

const LIST_COLUMNS: ColumnsType<ComplaintRow> = [
  { title: '投诉人', dataIndex: 'complainant', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="blue">{v}</Tag> },
  {
    title: '类型',
    dataIndex: 'type',
    render: (v: string) => {
      const m = TYPE_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  {
    title: '状态',
    dataIndex: 'status',
    render: (v: string) => {
      const m = STATUS_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
];

const HANDLE_COLUMNS: ColumnsType<HandleRow> = [
  { title: '投诉编号', dataIndex: 'complaintNo', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '受理人', dataIndex: 'handler' },
  {
    title: '处理时限',
    dataIndex: 'hours',
    render: (v: number) => hoursTag(v),
    sorter: (a, b) => b.hours - a.hours,
  },
  {
    title: '处理结果',
    dataIndex: 'result',
    render: (v: string) => {
      const m = RESULT_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
];

export default function ComplaintBoardM505Page() {
  usePageTitle('医疗投诉处理管理看板');
  const { list, handles, stats, loading, error, demo, load } = useComplaintBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && list.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载投诉看板…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="医疗投诉处理管理看板（智慧服务三级 P0 合规重点）"
      description="投诉列表 / 处理记录 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /complaint/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.bad}` }}>
            <Statistic
              title="本月投诉量"
              value={stats?.monthlyCount ?? list.length}
              suffix="件"
              valueStyle={{ color: JL.bad }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${(stats?.resolvedRate ?? 0) >= 90 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="办结率"
              value={stats?.resolvedRate ?? 0}
              precision={1}
              suffix="%"
              valueStyle={{ color: (stats?.resolvedRate ?? 0) >= 90 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${(stats?.satisfaction ?? 0) >= 85 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="满意率"
              value={stats?.satisfaction ?? 0}
              precision={1}
              suffix="%"
              valueStyle={{ color: (stats?.satisfaction ?? 0) >= 85 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic
              title="平均处理时长"
              value={stats?.avgHours ?? 0}
              precision={1}
              suffix="小时"
              valueStyle={{ color: JL.accent }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>投诉列表</span>}
            style={{ borderTop: `3px solid ${JL.bad}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={LIST_COLUMNS} dataSource={list} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>处理记录</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table rowKey="id" columns={HANDLE_COLUMNS} dataSource={handles} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
