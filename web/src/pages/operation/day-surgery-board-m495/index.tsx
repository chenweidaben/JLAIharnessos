/**
 * 健澜科技 jlmedaios - 日间手术管理看板（M495）
 * 路由：/operation/day-surgery-board
 * 顶部 KPI：今日日间手术台次 / 日间手术占比 / 24h 出院率 / 非计划再入院率
 * 手术列表 / 质量指标 / 再入院
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9；达标 #52C41A、临界 #FA8C16、未达 #D9534F
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { QualityRow, ReadmissionRow, SurgeryRow } from '@/services/api/daySurgeryBoard';
import { useDaySurgeryBoardStore } from '@/store/daySurgeryBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const STATUS_META: Record<string, { color: string; label: string }> = {
  scheduled: { color: 'default', label: '待手术' },
  ongoing: { color: 'blue', label: '进行中' },
  done: { color: 'green', label: '已完成' },
  transferred: { color: 'red', label: '中转住院' },
};

const LIABILITY_META: Record<string, { color: string; label: string }> = {
  related: { color: 'red', label: '手术相关' },
  unrelated: { color: 'green', label: '非手术相关' },
  under_review: { color: 'orange', label: '待判定' },
};

function qualityColor(rate: number): string {
  return rate >= 100 ? JL.ok : rate >= 85 ? JL.warn : JL.bad;
}

const LIST_COLUMNS: ColumnsType<SurgeryRow> = [
  { title: '患者', dataIndex: 'patient', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '手术名称', dataIndex: 'operation' },
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="blue">{v}</Tag> },
  { title: '手术医师', dataIndex: 'surgeon' },
  { title: '开始', dataIndex: 'startTime' },
  { title: '结束', dataIndex: 'endTime' },
  {
    title: '状态',
    dataIndex: 'status',
    render: (v: string) => {
      const m = STATUS_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
];

const QUALITY_COLUMNS: ColumnsType<QualityRow> = [
  { title: '指标', dataIndex: 'name', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '本期值', dataIndex: 'current', render: (v: number) => `${v}%` },
  { title: '目标值', dataIndex: 'target', render: (v: number) => `${v}%` },
  {
    title: '达成率',
    dataIndex: 'rate',
    render: (v: number) => (
      <Progress
        percent={v}
        size="small"
        style={{ width: 180 }}
        strokeColor={qualityColor(v)}
      />
    ),
    sorter: (a, b) => b.rate - a.rate,
  },
];

const READMIT_COLUMNS: ColumnsType<ReadmissionRow> = [
  { title: '患者', dataIndex: 'patient', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '再入院原因', dataIndex: 'reason' },
  { title: '距上次手术(天)', dataIndex: 'days', sorter: (a, b) => b.days - a.days },
  {
    title: '责任判定',
    dataIndex: 'liability',
    render: (v: string) => {
      const m = LIABILITY_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
];

export default function DaySurgeryBoardM495Page() {
  usePageTitle('日间手术管理看板');
  const { list, quality, readmissions, loading, error, demo, load } = useDaySurgeryBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && list.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载日间手术看板…" />
      </div>
    );
  }

  const doneCount = list.filter((r) => r.status === 'done').length;
  const ongoing = list.filter((r) => r.status === 'ongoing').length;
  const daySurgeryRatio = quality.find((q) => q.name.includes('日间手术占择期'))?.current ?? 0;
  const discharge24h = quality.find((q) => q.name.includes('24'))?.current ?? 0;
  const readmitRate = quality.find((q) => q.name.includes('非计划再入院'))?.current ?? 0;

  return (
    <PageContainer
      title="日间手术管理看板"
      description="今日手术 / 质量指标 / 非计划再入院 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /day-surgery/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="今日日间手术"
              value={list.length}
              suffix={`台（已完成 ${doneCount} / 进行中 ${ongoing}）`}
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic
              title="日间手术占择期比"
              value={daySurgeryRatio}
              precision={1}
              suffix="%"
              valueStyle={{ color: JL.accent }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${discharge24h >= 95 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="24 小时出院率"
              value={discharge24h}
              precision={1}
              suffix="%"
              valueStyle={{ color: discharge24h >= 95 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${readmitRate <= 1 ? JL.ok : readmitRate <= 2 ? JL.warn : JL.bad}` }}>
            <Statistic
              title="非计划再入院率"
              value={readmitRate}
              precision={2}
              suffix="%"
              valueStyle={{ color: readmitRate <= 1 ? JL.ok : readmitRate <= 2 ? JL.warn : JL.bad, fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>今日日间手术列表</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={LIST_COLUMNS} dataSource={list} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>非计划再入院</span>}
            style={{ borderTop: `3px solid ${JL.bad}` }}
          >
            <Table rowKey="id" columns={READMIT_COLUMNS} dataSource={readmissions} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>质量指标达成</span>}
            style={{ borderTop: `3px solid ${JL.ok}` }}
          >
            <Table rowKey="id" columns={QUALITY_COLUMNS} dataSource={quality} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
