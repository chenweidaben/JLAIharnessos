/**
 * 健澜科技 jlmedaios - 患者健康教育看板（M496）
 * 路由：/patient/health-edu-board
 * 顶部 KPI：健康教育材料数 / 本月健康讲座场次 / 宣教覆盖率 / 患者满意度
 * 材料库 / 讲座活动 / 宣教覆盖
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9；覆盖率 #52C41A、未达标 #FA8C16
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { ActivityRow, CoverageRow, MaterialRow } from '@/services/api/healthEduBoard';
import { useHealthEduBoardStore } from '@/store/healthEduBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const MATERIAL_TYPE: Record<string, { color: string; label: string }> = {
  brochure: { color: 'blue', label: '手册' },
  video: { color: 'purple', label: '视频' },
  poster: { color: 'orange', label: '海报' },
  article: { color: 'cyan', label: '文章' },
};

function rateColor(v: number): string {
  return v >= 90 ? JL.ok : v >= 80 ? JL.warn : JL.bad;
}

const MATERIAL_COLUMNS: ColumnsType<MaterialRow> = [
  { title: '材料名称', dataIndex: 'name', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '类型',
    dataIndex: 'type',
    render: (v: string) => {
      const m = MATERIAL_TYPE[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '发布科室', dataIndex: 'dept' },
  { title: '浏览次数', dataIndex: 'views', sorter: (a, b) => b.views - a.views },
  { title: '更新日期', dataIndex: 'updatedAt' },
];

const ACTIVITY_COLUMNS: ColumnsType<ActivityRow> = [
  { title: '主题', dataIndex: 'topic', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="blue">{v}</Tag> },
  { title: '主讲人', dataIndex: 'lecturer' },
  { title: '参与人数', dataIndex: 'attendees', sorter: (a, b) => b.attendees - a.attendees },
  { title: '时间', dataIndex: 'time' },
];

const COVERAGE_COLUMNS: ColumnsType<CoverageRow> = [
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '住院患者宣教率',
    dataIndex: 'inpatientRate',
    render: (v: number) => (
      <Progress percent={v} size="small" style={{ width: 160 }} strokeColor={rateColor(v)} />
    ),
    sorter: (a, b) => b.inpatientRate - a.inpatientRate,
  },
  {
    title: '门诊患者宣教率',
    dataIndex: 'outpatientRate',
    render: (v: number) => (
      <Progress percent={v} size="small" style={{ width: 160 }} strokeColor={rateColor(v)} />
    ),
  },
  {
    title: '满意度',
    dataIndex: 'satisfaction',
    render: (v: number) => (
      <Text style={{ color: rateColor(v), fontWeight: 600 }}>{v.toFixed(1)}%</Text>
    ),
  },
];

export default function HealthEduBoardM496Page() {
  usePageTitle('患者健康教育看板');
  const { materials, activities, coverage, loading, error, demo, load } = useHealthEduBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && materials.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载健康教育看板…" />
      </div>
    );
  }

  const avgInpatient = coverage.length > 0
    ? coverage.reduce((s, r) => s + r.inpatientRate, 0) / coverage.length
    : 0;
  const avgOutpatient = coverage.length > 0
    ? coverage.reduce((s, r) => s + r.outpatientRate, 0) / coverage.length
    : 0;
  const avgCoverage = (avgInpatient + avgOutpatient) / 2;
  const avgSatisfaction = coverage.length > 0
    ? coverage.reduce((s, r) => s + r.satisfaction, 0) / coverage.length
    : 0;

  return (
    <PageContainer
      title="患者健康教育看板"
      description="材料库 / 讲座活动 / 宣教覆盖 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /health-edu/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="健康教育材料"
              value={materials.length}
              suffix="种"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic
              title="本月健康讲座"
              value={activities.length}
              suffix="场"
              valueStyle={{ color: JL.accent }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${rateColor(avgCoverage)}` }}>
            <Statistic
              title="宣教平均覆盖率"
              value={avgCoverage}
              precision={1}
              suffix="%"
              valueStyle={{ color: rateColor(avgCoverage) }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${rateColor(avgSatisfaction)}` }}>
            <Statistic
              title="患者满意度"
              value={avgSatisfaction}
              precision={1}
              suffix="%"
              valueStyle={{ color: rateColor(avgSatisfaction) }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>材料库</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={MATERIAL_COLUMNS} dataSource={materials} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>本月讲座活动</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table rowKey="id" columns={ACTIVITY_COLUMNS} dataSource={activities} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>宣教覆盖（按科室）</span>}
            style={{ borderTop: `3px solid ${JL.ok}` }}
          >
            <Table rowKey="id" columns={COVERAGE_COLUMNS} dataSource={coverage} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
