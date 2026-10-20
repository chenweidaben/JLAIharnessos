/**
 * 健澜科技 jlmedaios - 教学管理看板（M493）
 * 路由：/edu/board
 * 顶部 KPI：本周教学查房次数 / 出科考核合格率 / 在培进修医师 / 教学覆盖率
 * 教学查房 / 出科考核 / 进修医师
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9；合格率 #52C41A、预警 #D9534F
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { ExamRow, FellowRow, RoundsRow } from '@/services/api/eduBoard';
import { useEduBoardStore } from '@/store/eduBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const ROUNDS_COLUMNS: ColumnsType<RoundsRow> = [
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '本周次数', dataIndex: 'count', sorter: (a, b) => b.count - a.count },
  { title: '参与医师', dataIndex: 'participants' },
  { title: '教学主任', dataIndex: 'director', render: (v: string) => <Tag color="blue">{v}</Tag> },
];

const EXAM_COLUMNS: ColumnsType<ExamRow> = [
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '考核人数', dataIndex: 'examinees' },
  {
    title: '合格率',
    dataIndex: 'passRate',
    render: (v: number) => (
      <Progress
        percent={v}
        size="small"
        style={{ width: 160 }}
        strokeColor={v >= 90 ? JL.ok : v >= 85 ? JL.warn : JL.bad}
      />
    ),
    sorter: (a, b) => b.passRate - a.passRate,
  },
  {
    title: '平均成绩',
    dataIndex: 'avgScore',
    render: (v: number) => (
      <Text style={{ color: v >= 80 ? JL.ok : v >= 75 ? JL.warn : JL.bad, fontWeight: 600 }}>
        {v.toFixed(1)}
      </Text>
    ),
  },
];

const FELLOW_COLUMNS: ColumnsType<FellowRow> = [
  { title: '来源医院', dataIndex: 'source', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '在培人数', dataIndex: 'current', sorter: (a, b) => b.current - a.current },
  {
    title: '结业率',
    dataIndex: 'graduateRate',
    render: (v: number) => (
      <Text style={{ color: v >= 95 ? JL.ok : v >= 90 ? JL.warn : JL.bad, fontWeight: 600 }}>
        {v.toFixed(1)}%
      </Text>
    ),
    sorter: (a, b) => b.graduateRate - a.graduateRate,
  },
];

export default function EduBoardM493Page() {
  usePageTitle('教学管理看板');
  const { rounds, exams, fellows, loading, error, demo, load } = useEduBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && rounds.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载教学看板…" />
      </div>
    );
  }

  const totalRounds = rounds.reduce((s, r) => s + r.count, 0);
  const avgPassRate = exams.length > 0 ? exams.reduce((s, r) => s + r.passRate, 0) / exams.length : 0;
  const totalFellows = fellows.reduce((s, r) => s + r.current, 0);
  const teachingCoverage = Math.min(100, (rounds.length / 12) * 100);

  return (
    <PageContainer
      title="教学管理看板"
      description="教学查房 / 出科考核 / 进修医师一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /edu/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="本周教学查房"
              value={totalRounds}
              suffix="次"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${avgPassRate >= 90 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="出科考核平均合格率"
              value={avgPassRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: avgPassRate >= 90 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic
              title="在培进修医师"
              value={totalFellows}
              suffix="人"
              valueStyle={{ color: JL.accent }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${teachingCoverage >= 80 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="教学覆盖率"
              value={teachingCoverage}
              precision={0}
              suffix="%"
              valueStyle={{ color: teachingCoverage >= 80 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>本周教学查房</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={ROUNDS_COLUMNS} dataSource={rounds} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>进修医师（在培）</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table rowKey="id" columns={FELLOW_COLUMNS} dataSource={fellows} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>出科考核合格率</span>}
            style={{ borderTop: `3px solid ${JL.ok}` }}
          >
            <Table rowKey="id" columns={EXAM_COLUMNS} dataSource={exams} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
