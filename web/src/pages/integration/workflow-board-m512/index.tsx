/**
 * 健澜科技 jlmedaios - 角色工作流引擎监控看板（M512）
 * 路由：/integration/workflow-board
 * 顶部 KPI：今日流程实例 / 平均流转时长 / 异常率 / 角色待办总数
 * 工作流实例 / 节点监控
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { InstanceRow, NodeRow } from '@/services/api/workflowBoard';
import { useWorkflowBoardStore } from '@/store/workflowBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const PROCESS_META: Record<string, { color: string; label: string }> = {
  outpatient: { color: 'blue', label: '门诊接诊' },
  inpatientOrder: { color: 'orange', label: '住院医嘱' },
  labRequest: { color: 'green', label: '检验申请' },
  imagingRequest: { color: 'red', label: '检查申请' },
  surgerySchedule: { color: 'purple', label: '手术安排' },
};

const ROLE_META: Record<string, { color: string; label: string }> = {
  doctor: { color: 'blue', label: '医生' },
  nurse: { color: 'green', label: '护士' },
  pharmacist: { color: 'orange', label: '药师' },
  labTech: { color: 'purple', label: '检验师' },
  imagingTech: { color: 'cyan', label: '技师' },
};

const STATUS_META: Record<string, { color: string; label: string }> = {
  running: { color: 'blue', label: '运行中' },
  completed: { color: 'green', label: '已完成' },
  error: { color: 'red', label: '异常' },
  terminated: { color: 'default', label: '已终止' },
};

function avgMinTag(m: number) {
  if (m < 5) return <Tag color="green">&lt;5min</Tag>;
  if (m <= 15) return <Tag color="orange">5-15min</Tag>;
  return <Tag color="red">&gt;15min</Tag>;
}

const INSTANCE_COLUMNS: ColumnsType<InstanceRow> = [
  {
    title: '流程名称',
    dataIndex: 'process',
    render: (v: string) => {
      const m = PROCESS_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '当前节点', dataIndex: 'currentNode', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '角色',
    dataIndex: 'role',
    render: (v: string) => {
      const m = ROLE_META[v] ?? { color: 'default', label: v };
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

const NODE_COLUMNS: ColumnsType<NodeRow> = [
  { title: '节点名称', dataIndex: 'nodeName', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '处理人', dataIndex: 'handler' },
  {
    title: '平均处理时长',
    dataIndex: 'avgMinutes',
    render: (v: number) => avgMinTag(v),
    sorter: (a, b) => b.avgMinutes - a.avgMinutes,
  },
  {
    title: '积压任务数',
    dataIndex: 'backlog',
    render: (v: number) => (v > 20 ? <Tag color="red">{v}</Tag> : v > 0 ? <Tag color="orange">{v}</Tag> : <Tag color="green">0</Tag>),
  },
];

export default function WorkflowBoardM512Page() {
  usePageTitle('角色工作流引擎监控看板');
  const { instances, nodes, stats, loading, error, demo, load } = useWorkflowBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && instances.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载工作流看板…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="角色工作流引擎监控看板（电子病历五级 P0）"
      description="工作流实例 / 节点监控 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /workflow/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="今日流程实例"
              value={stats?.totalToday ?? 0}
              suffix="个"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic
              title="平均流转时长"
              value={stats?.avgFlowMinutes ?? 0}
              precision={1}
              suffix="分钟"
              valueStyle={{ color: JL.accent }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.bad}` }}>
            <Statistic
              title="异常率"
              value={stats?.errorRate ?? 0}
              precision={2}
              suffix="%"
              valueStyle={{ color: JL.bad }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.warn}` }}>
            <Statistic
              title="角色待办总数"
              value={stats?.todoByRoles ?? 0}
              suffix="件"
              valueStyle={{ color: JL.warn }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>工作流实例</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={INSTANCE_COLUMNS} dataSource={instances} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>节点监控</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table rowKey="id" columns={NODE_COLUMNS} dataSource={nodes} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
