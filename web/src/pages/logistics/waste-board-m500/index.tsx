/**
 * 健澜科技 jlmedaios - 医疗废弃物全流程管理看板（M500 里程碑）
 * 路由：/logistics/waste-board
 * 顶部 KPI：本月医废总量 / 感染性占比 / 处置及时率 / 追溯完整率
 * 收集记录 / 处置记录 / 追溯链
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { CollectionRow, TraceabilityRow, TreatmentRow } from '@/services/api/wasteBoard';
import { useWasteBoardStore } from '@/store/wasteBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const CATEGORY_META: Record<string, { color: string; label: string }> = {
  infectious: { color: 'red', label: '感染性' },
  sharp: { color: 'gold', label: '损伤性' },
  pathological: { color: 'brown', label: '病理性' },
  chemical: { color: 'blue', label: '化学性' },
  pharmaceutical: { color: 'purple', label: '药物性' },
};

const METHOD_META: Record<string, { color: string; label: string }> = {
  autoclave: { color: 'green', label: '高温蒸煮' },
  incineration: { color: 'red', label: '焚烧' },
  disinfection: { color: 'blue', label: '消毒' },
  chemical: { color: 'orange', label: '化学处理' },
};

const STATUS_META: Record<string, { color: string; label: string }> = {
  collected: { color: 'blue', label: '已收集' },
  transferred: { color: 'orange', label: '转运中' },
  treated: { color: 'green', label: '已处置' },
};

const COLLECTION_COLUMNS: ColumnsType<CollectionRow> = [
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="blue">{v}</Tag> },
  {
    title: '类别',
    dataIndex: 'category',
    render: (v: string) => {
      const m = CATEGORY_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '重量(kg)', dataIndex: 'weight', sorter: (a, b) => b.weight - a.weight },
  { title: '收集时间', dataIndex: 'collectedAt' },
];

const TREATMENT_COLUMNS: ColumnsType<TreatmentRow> = [
  {
    title: '处置方式',
    dataIndex: 'method',
    render: (v: string) => {
      const m = METHOD_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '重量(kg)', dataIndex: 'weight', sorter: (a, b) => b.weight - a.weight },
  { title: '处置时间', dataIndex: 'treatedAt' },
  { title: '处置单位', dataIndex: 'vendor', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
];

const TRACE_COLUMNS: ColumnsType<TraceabilityRow> = [
  { title: '批次号', dataIndex: 'batchNo', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '产生科室', dataIndex: 'dept' },
  { title: '交接人', dataIndex: 'collector' },
  { title: '接收人', dataIndex: 'receiver' },
  {
    title: '状态',
    dataIndex: 'status',
    render: (v: string) => {
      const m = STATUS_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
];

export default function WasteBoardM500Page() {
  usePageTitle('医疗废弃物全流程管理看板');
  const { collection, treatment, traceability, stats, loading, error, demo, load } = useWasteBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && collection.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载医废看板…" />
      </div>
    );
  }

  const totalWeight = stats?.totalWeight ?? collection.reduce((s, r) => s + r.weight, 0);
  const infectiousRatio = stats?.infectiousRatio ?? 0;
  const timelyRate = stats?.timelyRate ?? 0;
  const traceRate = stats?.traceabilityRate ?? 0;

  return (
    <PageContainer
      title="医疗废弃物全流程管理看板（M500 里程碑）"
      description="收集 / 处置 / 追溯 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /waste/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="本月医废总量"
              value={totalWeight}
              precision={1}
              suffix="kg"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.bad}` }}>
            <Statistic
              title="感染性医废占比"
              value={infectiousRatio}
              precision={1}
              suffix="%"
              valueStyle={{ color: JL.bad }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${timelyRate >= 95 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="处置及时率"
              value={timelyRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: timelyRate >= 95 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${traceRate >= 99 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="追溯完整率"
              value={traceRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: traceRate >= 99 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>收集记录</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={COLLECTION_COLUMNS} dataSource={collection} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>处置记录</span>}
            style={{ borderTop: `3px solid ${JL.ok}` }}
          >
            <Table rowKey="id" columns={TREATMENT_COLUMNS} dataSource={treatment} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>追溯链</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table rowKey="id" columns={TRACE_COLUMNS} dataSource={traceability} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
