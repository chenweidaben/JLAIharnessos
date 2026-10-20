/**
 * 健澜科技 jlmedaios - 医疗技术临床应用管理看板（M498）
 * 路由：/tech/clinical-board
 * 顶部 KPI：开展医疗技术总数 / 四级手术授权医师数 / 技术并发症率 / 技术成功率
 * 技术目录 / 医师授权 / 技术质量
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { AuthorityRow, CatalogRow, QualityRow } from '@/services/api/techBoard';
import { useTechBoardStore } from '@/store/techBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const LEVEL_META: Record<string, { color: string; label: string }> = {
  level1: { color: 'blue', label: '一级准入' },
  level2: { color: 'orange', label: '二级备案' },
  level3: { color: 'red', label: '三级审批' },
};

const RISK_META: Record<string, { color: string; label: string }> = {
  low: { color: 'green', label: '低风险' },
  medium: { color: 'orange', label: '中风险' },
  high: { color: 'red', label: '高风险' },
};

const AUTH_LEVEL_META: Record<string, { color: string; label: string }> = {
  level1: { color: 'green', label: '一级' },
  level2: { color: 'blue', label: '二级' },
  level3: { color: 'orange', label: '三级' },
  level4: { color: 'red', label: '四级' },
};

const GRADE_META: Record<string, { color: string; label: string }> = {
  excellent: { color: 'green', label: '优' },
  good: { color: 'blue', label: '良' },
  average: { color: 'orange', label: '一般' },
  poor: { color: 'red', label: '差' },
};

const CATALOG_COLUMNS: ColumnsType<CatalogRow> = [
  { title: '技术名称', dataIndex: 'name', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '级别',
    dataIndex: 'level',
    render: (v: string) => {
      const m = LEVEL_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '开展科室', dataIndex: 'dept', render: (v: string) => <Tag color="blue">{v}</Tag> },
  {
    title: '风险等级',
    dataIndex: 'risk',
    render: (v: string) => {
      const m = RISK_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
];

const AUTH_COLUMNS: ColumnsType<AuthorityRow> = [
  { title: '医师', dataIndex: 'doctor', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '科室', dataIndex: 'dept' },
  {
    title: '授权级别',
    dataIndex: 'authLevel',
    render: (v: string) => {
      const m = AUTH_LEVEL_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '授权日期', dataIndex: 'grantedAt' },
  { title: '有效期至', dataIndex: 'expiresAt' },
];

const QUALITY_COLUMNS: ColumnsType<QualityRow> = [
  { title: '技术名称', dataIndex: 'tech', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '例数', dataIndex: 'cases', sorter: (a, b) => b.cases - a.cases },
  {
    title: '并发症率',
    dataIndex: 'complicationRate',
    render: (v: number) => (
      <Progress
        percent={Math.min(100, v * 5)}
        size="small"
        style={{ width: 120 }}
        strokeColor={v <= 2 ? JL.ok : v <= 5 ? JL.warn : JL.bad}
        format={() => `${v}%`}
      />
    ),
    sorter: (a, b) => b.complicationRate - a.complicationRate,
  },
  {
    title: '成功率',
    dataIndex: 'successRate',
    render: (v: number) => (
      <Text style={{ color: v >= 95 ? JL.ok : v >= 90 ? JL.warn : JL.bad, fontWeight: 600 }}>
        {v.toFixed(1)}%
      </Text>
    ),
  },
  {
    title: '质控评级',
    dataIndex: 'grade',
    render: (v: string) => {
      const m = GRADE_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
];

export default function TechClinicalBoardM498Page() {
  usePageTitle('医疗技术临床应用管理看板');
  const { catalog, authority, quality, loading, error, demo, load } = useTechBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && catalog.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载技术管理看板…" />
      </div>
    );
  }

  const level4Count = authority.filter((a) => a.authLevel === 'level4').length;
  const avgComplication = quality.length > 0
    ? quality.reduce((s, r) => s + r.complicationRate, 0) / quality.length
    : 0;
  const avgSuccess = quality.length > 0
    ? quality.reduce((s, r) => s + r.successRate, 0) / quality.length
    : 0;

  return (
    <PageContainer
      title="医疗技术临床应用管理看板"
      description="技术目录 / 医师授权 / 技术质量 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /tech/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="开展医疗技术"
              value={catalog.length}
              suffix="项"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.bad}` }}>
            <Statistic
              title="四级手术授权医师"
              value={level4Count}
              suffix="人"
              valueStyle={{ color: JL.bad }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${avgComplication <= 2 ? JL.ok : avgComplication <= 5 ? JL.warn : JL.bad}` }}>
            <Statistic
              title="平均并发症率"
              value={avgComplication}
              precision={2}
              suffix="%"
              valueStyle={{ color: avgComplication <= 2 ? JL.ok : avgComplication <= 5 ? JL.warn : JL.bad }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${avgSuccess >= 95 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="平均成功率"
              value={avgSuccess}
              precision={1}
              suffix="%"
              valueStyle={{ color: avgSuccess >= 95 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>医疗技术目录</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={CATALOG_COLUMNS} dataSource={catalog} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>技术质量</span>}
            style={{ borderTop: `3px solid ${JL.ok}` }}
          >
            <Table rowKey="id" columns={QUALITY_COLUMNS} dataSource={quality} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>医师手术授权</span>}
            style={{ borderTop: `3px solid ${JL.bad}` }}
          >
            <Table rowKey="id" columns={AUTH_COLUMNS} dataSource={authority} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
