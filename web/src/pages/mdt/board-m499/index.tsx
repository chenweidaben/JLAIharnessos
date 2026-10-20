/**
 * 健澜科技 jlmedaios - 多学科会诊（MDT）管理看板（M499）
 * 路由：/mdt/board
 * 顶部 KPI：本月 MDT 例数 / 平均参与科室数 / 方案采纳率 / 患者好转率
 * MDT 病例 / MDT 排程 / 效果评估
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { CaseRow, EffectRow, ScheduleRow } from '@/services/api/mdtBoard';
import { useMdtBoardStore } from '@/store/mdtBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const CASE_STATUS: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待会诊' },
  ongoing: { color: 'blue', label: '进行中' },
  done: { color: 'green', label: '已完成' },
};

const OUTCOME: Record<string, { color: string; label: string }> = {
  improved: { color: 'green', label: '好转' },
  stable: { color: 'orange', label: '稳定' },
  worsened: { color: 'red', label: '恶化' },
};

const CASE_COLUMNS: ColumnsType<CaseRow> = [
  { title: '患者', dataIndex: 'patient', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '诊断', dataIndex: 'diagnosis' },
  { title: '申请科室', dataIndex: 'applyDept', render: (v: string) => <Tag color="blue">{v}</Tag> },
  { title: '参与科室数', dataIndex: 'deptCount', sorter: (a, b) => b.deptCount - a.deptCount },
  {
    title: '状态',
    dataIndex: 'status',
    render: (v: string) => {
      const m = CASE_STATUS[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
];

const SCHEDULE_COLUMNS: ColumnsType<ScheduleRow> = [
  { title: 'MDT 类型', dataIndex: 'type', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '时间', dataIndex: 'time' },
  { title: '地点', dataIndex: 'location' },
  { title: '主持医师', dataIndex: 'chair' },
  { title: '参与科室数', dataIndex: 'deptCount', sorter: (a, b) => b.deptCount - a.deptCount },
];

const EFFECT_COLUMNS: ColumnsType<EffectRow> = [
  { title: '病例', dataIndex: 'caseId', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '方案采纳率',
    dataIndex: 'adoptionRate',
    render: (v: number) => (
      <Progress
        percent={v}
        size="small"
        style={{ width: 160 }}
        strokeColor={v >= 90 ? JL.ok : v >= 75 ? JL.warn : JL.bad}
      />
    ),
    sorter: (a, b) => b.adoptionRate - a.adoptionRate,
  },
  {
    title: '患者预后',
    dataIndex: 'outcome',
    render: (v: string) => {
      const m = OUTCOME[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '随访结论', dataIndex: 'followup' },
];

export default function MdtBoardM499Page() {
  usePageTitle('MDT 管理看板');
  const { cases, schedule, effects, loading, error, demo, load } = useMdtBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && cases.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载 MDT 看板…" />
      </div>
    );
  }

  const avgDept = cases.length > 0
    ? cases.reduce((s, r) => s + r.deptCount, 0) / cases.length
    : 0;
  const avgAdoption = effects.length > 0
    ? effects.reduce((s, r) => s + r.adoptionRate, 0) / effects.length
    : 0;
  const improved = effects.filter((e) => e.outcome === 'improved').length;
  const improvementRate = effects.length > 0 ? (improved / effects.length) * 100 : 0;

  return (
    <PageContainer
      title="多学科会诊（MDT）管理看板"
      description="MDT 病例 / 排程 / 效果评估 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /mdt/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="本月 MDT 病例"
              value={cases.length}
              suffix="例"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic
              title="平均参与科室"
              value={avgDept}
              precision={1}
              suffix="个"
              valueStyle={{ color: JL.accent }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${avgAdoption >= 90 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="方案平均采纳率"
              value={avgAdoption}
              precision={1}
              suffix="%"
              valueStyle={{ color: avgAdoption >= 90 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${improvementRate >= 60 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="患者好转率"
              value={improvementRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: improvementRate >= 60 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>MDT 病例</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={CASE_COLUMNS} dataSource={cases} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>效果评估</span>}
            style={{ borderTop: `3px solid ${JL.ok}` }}
          >
            <Table rowKey="id" columns={EFFECT_COLUMNS} dataSource={effects} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>MDT 排程</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table rowKey="id" columns={SCHEDULE_COLUMNS} dataSource={schedule} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
