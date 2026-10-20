/**
 * 健澜科技 jlmedaios - 医德医风考评看板（M497）
 * 路由：/ethics/board
 * 顶部 KPI：年度考评优秀率 / 投诉办结率 / 表彰奖励人次 / 医德总分均值
 * 考评 / 投诉核查 / 表彰奖励
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { ComplaintRow, EvaluationRow, RewardRow } from '@/services/api/ethicsBoard';
import { useEthicsBoardStore } from '@/store/ethicsBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const GRADE_META: Record<string, { color: string; label: string }> = {
  excellent: { color: 'blue', label: '优秀' },
  good: { color: 'green', label: '良好' },
  average: { color: 'orange', label: '一般' },
  poor: { color: 'red', label: '较差' },
};

const CONCLUSION_META: Record<string, { color: string; label: string }> = {
  confirmed: { color: 'red', label: '属实' },
  unfounded: { color: 'green', label: '不属实' },
  under_review: { color: 'orange', label: '核查中' },
};

const REWARD_LEVEL_META: Record<string, { color: string; label: string }> = {
  national: { color: 'gold', label: '国家级' },
  provincial: { color: 'silver', label: '省级' },
  municipal: { color: 'bronze', label: '市级' },
  hospital: { color: 'blue', label: '院级' },
};

const EVAL_COLUMNS: ColumnsType<EvaluationRow> = [
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="blue">{v}</Tag> },
  { title: '医师', dataIndex: 'doctor', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '考评得分',
    dataIndex: 'score',
    render: (v: number) => (
      <Progress percent={v} size="small" style={{ width: 140 }} strokeColor={v >= 90 ? JL.accent : v >= 80 ? JL.ok : v >= 70 ? JL.warn : JL.bad} />
    ),
    sorter: (a, b) => b.score - a.score,
  },
  {
    title: '等次',
    dataIndex: 'grade',
    render: (v: string) => {
      const m = GRADE_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
];

const COMPLAINT_COLUMNS: ColumnsType<ComplaintRow> = [
  { title: '投诉内容', dataIndex: 'content', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '被投诉人', dataIndex: 'accused' },
  {
    title: '核查结论',
    dataIndex: 'conclusion',
    render: (v: string) => {
      const m = CONCLUSION_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '处理结果', dataIndex: 'result' },
];

const REWARD_COLUMNS: ColumnsType<RewardRow> = [
  { title: '奖励名称', dataIndex: 'name', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '获奖人', dataIndex: 'recipient' },
  {
    title: '颁奖级别',
    dataIndex: 'level',
    render: (v: string) => {
      const m = REWARD_LEVEL_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '时间', dataIndex: 'time' },
];

export default function EthicsBoardM497Page() {
  usePageTitle('医德医风考评看板');
  const { evaluations, complaints, rewards, loading, error, demo, load } = useEthicsBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && evaluations.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载医德医风看板…" />
      </div>
    );
  }

  const excellentCount = evaluations.filter((r) => r.grade === 'excellent').length;
  const excellentRate = evaluations.length > 0 ? (excellentCount / evaluations.length) * 100 : 0;
  const closedComplaints = complaints.filter((c) => c.conclusion !== 'under_review').length;
  const complaintClosedRate = complaints.length > 0 ? (closedComplaints / complaints.length) * 100 : 0;
  const avgScore = evaluations.length > 0
    ? evaluations.reduce((s, r) => s + r.score, 0) / evaluations.length
    : 0;

  return (
    <PageContainer
      title="医德医风考评看板"
      description="年度考评 / 投诉核查 / 表彰奖励 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /ethics/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic
              title="年度考评优秀率"
              value={excellentRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: JL.accent }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${complaintClosedRate >= 80 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="投诉办结率"
              value={complaintClosedRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: complaintClosedRate >= 80 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.warn}` }}>
            <Statistic
              title="表彰奖励"
              value={rewards.length}
              suffix="人次"
              valueStyle={{ color: JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="医德总分均值"
              value={avgScore}
              precision={1}
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>年度医德医风考评</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={EVAL_COLUMNS} dataSource={evaluations} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>表彰奖励</span>}
            style={{ borderTop: `3px solid ${JL.warn}` }}
          >
            <Table rowKey="id" columns={REWARD_COLUMNS} dataSource={rewards} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>投诉核查</span>}
            style={{ borderTop: `3px solid ${JL.bad}` }}
          >
            <Table rowKey="id" columns={COMPLAINT_COLUMNS} dataSource={complaints} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
