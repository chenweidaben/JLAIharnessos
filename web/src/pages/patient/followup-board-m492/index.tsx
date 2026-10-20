/**
 * 健澜科技 jlmedaios - 患者随访看板（M492）
 * 路由：/patient/followup-board
 * 顶部 KPI：随访计划完成率 / 随访结果存活数 / 失访数 / 30 天再入院率
 * 随访计划 / 随访结果 / 30 天再入院
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9；再入院率 #D9534F、达标 #52C41A
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { PlanRow, ReadmissionRow, ResultRow } from '@/services/api/followupBoard';
import { useFollowupBoardStore } from '@/store/followupBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const OUTCOME_META: Record<string, { color: string; label: string }> = {
  alive: { color: 'green', label: '存活' },
  improved: { color: 'blue', label: '好转' },
  dead: { color: 'red', label: '死亡' },
  lost: { color: 'default', label: '失访' },
};

const PLAN_COLUMNS: ColumnsType<PlanRow> = [
  { title: '病种', dataIndex: 'disease', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '随访周期', dataIndex: 'cycle' },
  { title: '负责人', dataIndex: 'owner' },
  {
    title: '完成率',
    dataIndex: 'completionRate',
    render: (v: number) => (
      <Progress
        percent={v}
        size="small"
        style={{ width: 160 }}
        strokeColor={v >= 90 ? JL.ok : v >= 80 ? JL.warn : JL.bad}
      />
    ),
    sorter: (a, b) => b.completionRate - a.completionRate,
  },
];

const RESULT_COLUMNS: ColumnsType<ResultRow> = [
  { title: '病案号', dataIndex: 'mrn', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '姓名', dataIndex: 'name' },
  {
    title: '随访结果',
    dataIndex: 'outcome',
    render: (v: string) => {
      const m = OUTCOME_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '随访时间', dataIndex: 'followupAt' },
];

const READMIT_COLUMNS: ColumnsType<ReadmissionRow> = [
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '出院数', dataIndex: 'discharges', sorter: (a, b) => b.discharges - a.discharges },
  { title: '30 天再入院', dataIndex: 'readmissions' },
  {
    title: '再入院率',
    dataIndex: 'rate',
    render: (v: number) => (
      <Text style={{ color: v <= 5 ? JL.ok : v <= 8 ? JL.warn : JL.bad, fontWeight: 600 }}>
        {v.toFixed(2)}%
      </Text>
    ),
    sorter: (a, b) => b.rate - a.rate,
  },
];

export default function FollowupBoardM492Page() {
  usePageTitle('患者随访看板');
  const { plans, results, readmissions, loading, error, demo, load } = useFollowupBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && plans.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载随访看板…" />
      </div>
    );
  }

  const avgCompletion = plans.length > 0 ? plans.reduce((s, r) => s + r.completionRate, 0) / plans.length : 0;
  const alive = results.filter((r) => r.outcome === 'alive' || r.outcome === 'improved').length;
  const lost = results.filter((r) => r.outcome === 'lost').length;
  const totalDischarges = readmissions.reduce((s, r) => s + r.discharges, 0);
  const totalReadmit = readmissions.reduce((s, r) => s + r.readmissions, 0);
  const avgReadmit = totalDischarges > 0 ? (totalReadmit / totalDischarges) * 100 : 0;

  return (
    <PageContainer
      title="患者随访看板"
      description="随访计划 / 随访结果 / 30 天再入院一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /patient/followup-* 与 /quality/readmission-30d 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${avgCompletion >= 90 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="随访计划完成率"
              value={avgCompletion}
              precision={1}
              suffix="%"
              valueStyle={{ color: avgCompletion >= 90 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.ok}` }}>
            <Statistic
              title="随访结果存活/好转"
              value={alive}
              suffix={`/ ${results.length}`}
              valueStyle={{ color: JL.ok }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${lost > 0 ? JL.warn : JL.ok}` }}>
            <Statistic
              title="失访数"
              value={lost}
              valueStyle={{ color: lost > 0 ? JL.warn : JL.ok }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${avgReadmit <= 5 ? JL.ok : avgReadmit <= 8 ? JL.warn : JL.bad}` }}>
            <Statistic
              title="30 天再入院率"
              value={avgReadmit}
              precision={2}
              suffix="%"
              valueStyle={{ color: avgReadmit <= 5 ? JL.ok : avgReadmit <= 8 ? JL.warn : JL.bad, fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>随访计划完成率</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={PLAN_COLUMNS} dataSource={plans} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>30 天再入院率（按科室）</span>}
            style={{ borderTop: `3px solid ${avgReadmit <= 5 ? JL.ok : JL.bad}` }}
          >
            <Table rowKey="id" columns={READMIT_COLUMNS} dataSource={readmissions} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>近期随访结果</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table rowKey="id" columns={RESULT_COLUMNS} dataSource={results} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
