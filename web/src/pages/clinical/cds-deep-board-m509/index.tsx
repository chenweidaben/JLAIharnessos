/**
 * 健澜科技 jlmedaios - CDS 深度规则监控看板（M509）
 * 路由：/clinical/cds-deep-board
 * 顶部 KPI：今日用药审查 / 拦截警告 / 检验智能解读 / 路径推荐
 * 用药审查 / 检验解读 / 路径推荐
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { LabInterpretRow, MedReviewRow, PathwayRow } from '@/services/api/cdsDeepBoard';
import { useCdsDeepBoardStore } from '@/store/cdsDeepBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const REVIEW_TYPE: Record<string, { color: string; label: string }> = {
  interaction: { color: 'orange', label: '相互作用' },
  contraindication: { color: 'red', label: '禁忌' },
  dose: { color: 'blue', label: '剂量异常' },
  route: { color: 'purple', label: '给药途径' },
};

const REVIEW_RESULT: Record<string, { color: string; label: string }> = {
  pass: { color: 'green', label: '通过' },
  warning: { color: 'orange', label: '警告' },
  block: { color: 'red', label: '拦截' },
};

const FLAG_META: Record<string, { color: string; label: string }> = {
  normal: { color: 'green', label: '正常' },
  abnormal: { color: 'red', label: '异常' },
  critical: { color: 'purple', label: '危急值' },
};

function matchTag(r: number) {
  if (r >= 90) return <Tag color="green">{r.toFixed(1)}%</Tag>;
  if (r >= 70) return <Tag color="orange">{r.toFixed(1)}%</Tag>;
  return <Tag color="red">{r.toFixed(1)}%</Tag>;
}

const MED_COLUMNS: ColumnsType<MedReviewRow> = [
  { title: '药品', dataIndex: 'drug', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '审查类型',
    dataIndex: 'reviewType',
    render: (v: string) => {
      const m = REVIEW_TYPE[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  {
    title: '审查结果',
    dataIndex: 'result',
    render: (v: string) => {
      const m = REVIEW_RESULT[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
];

const LAB_COLUMNS: ColumnsType<LabInterpretRow> = [
  { title: '检验项目', dataIndex: 'item', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '结果值', dataIndex: 'value' },
  {
    title: '参考范围',
    dataIndex: 'flag',
    render: (v: string) => {
      const m = FLAG_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '智能建议', dataIndex: 'suggestion' },
];

const PATHWAY_COLUMNS: ColumnsType<PathwayRow> = [
  { title: '诊断', dataIndex: 'diagnosis', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '推荐路径', dataIndex: 'pathway' },
  {
    title: '匹配度',
    dataIndex: 'match',
    render: (v: number) => matchTag(v),
    sorter: (a, b) => b.match - a.match,
  },
  { title: '推荐科室', dataIndex: 'dept', render: (v: string) => <Tag color="blue">{v}</Tag> },
];

export default function CdsDeepBoardM509Page() {
  usePageTitle('CDS 深度规则监控看板');
  const { meds, labs, pathways, loading, error, demo, load } = useCdsDeepBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpi = useMemo(
    () => ({
      total: meds.length,
      blocked: meds.filter((m) => m.result !== 'pass').length,
      lab: labs.length,
      pathway: pathways.length,
    }),
    [meds, labs, pathways],
  );

  if (loading && meds.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载 CDS 看板…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="CDS 深度规则监控看板（电子病历五级 P0）"
      description="合理用药 / 检验解读 / 路径推荐 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /cds/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="今日合理用药审查"
              value={kpi.total}
              suffix="条"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.warn}` }}>
            <Statistic
              title="拦截/警告"
              value={kpi.blocked}
              suffix="条"
              valueStyle={{ color: JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.ok}` }}>
            <Statistic
              title="检验智能解读"
              value={kpi.lab}
              suffix="条"
              valueStyle={{ color: JL.ok }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${'#722ED1'}` }}>
            <Statistic
              title="路径推荐"
              value={kpi.pathway}
              suffix="条"
              valueStyle={{ color: '#722ED1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>用药审查</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={MED_COLUMNS} dataSource={meds} pagination={false} size="small" />
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>检验智能解读</span>}
            style={{ borderTop: `3px solid ${JL.ok}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={LAB_COLUMNS} dataSource={labs} pagination={false} size="small" />
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>路径推荐</span>}
            style={{ borderTop: `3px solid #722ED1` }}
          >
            <Table rowKey="id" columns={PATHWAY_COLUMNS} dataSource={pathways} pagination={false} size="small" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
