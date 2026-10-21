/**
 * 健澜科技 jlmedaios - 药品追溯深度监控看板（M518）
 * 路由：/pharmacy/trace-board
 * 顶部 KPI：今日追溯药品数 / 冷链异常报警数 / 近效期药品数 / 追溯完成率
 * 药品追溯 / 冷链监控 / 近效期预警
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { ColdChainRow, ExpiryRow, TraceRow } from '@/services/api/pharmacyTraceBoard';
import { usePharmacyTraceBoardStore } from '@/store/pharmacyTraceBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const TEMP_BAND: Record<string, { color: string; label: string }> = {
  ok: { color: 'green', label: '2-8℃' },
  low: { color: 'orange', label: '<2℃' },
  high: { color: 'red', label: '>8℃' },
};

function expiryTag(months: number) {
  if (months > 6) return <Tag color="green">{months.toFixed(1)} 月</Tag>;
  if (months >= 3) return <Tag color="gold">{months.toFixed(1)} 月</Tag>;
  if (months >= 1) return <Tag color="orange">{months.toFixed(1)} 月</Tag>;
  return <Tag color="red">{months.toFixed(1)} 月</Tag>;
}

const TRACE_COLUMNS: ColumnsType<TraceRow> = [
  { title: '药品名称', dataIndex: 'name', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '批号', dataIndex: 'batch', render: (v: string) => <Tag color="blue">{v}</Tag> },
  { title: '追溯码', dataIndex: 'traceCode', ellipsis: true },
  { title: '生产企业', dataIndex: 'manufacturer' },
  { title: '配送企业', dataIndex: 'distributor' },
  { title: '收货科室', dataIndex: 'dept', render: (v: string) => <Tag color="green">{v}</Tag> },
  {
    title: '全程温度',
    dataIndex: 'tempStatus',
    render: (v: string) => (v === 'normal' ? <Tag color="green">正常</Tag> : <Tag color="red">异常</Tag>),
  },
];

const COLD_COLUMNS: ColumnsType<ColdChainRow> = [
  { title: '药品名称', dataIndex: 'name', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '温度',
    dataIndex: 'tempBand',
    render: (v: string) => {
      const m = TEMP_BAND[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '记录时间', dataIndex: 'recordedAt' },
  {
    title: '异常报警',
    dataIndex: 'alarm',
    render: (v: boolean) => (v ? <Tag color="red">已报警</Tag> : <Tag color="green">正常</Tag>),
  },
];

const EXPIRY_COLUMNS: ColumnsType<ExpiryRow> = [
  { title: '药品名称', dataIndex: 'name', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '批号', dataIndex: 'batch', render: (v: string) => <Tag color="blue">{v}</Tag> },
  { title: '效期', dataIndex: 'monthsLeft', render: (v: number) => expiryTag(v), sorter: (a, b) => a.monthsLeft - b.monthsLeft },
  { title: '库存数量', dataIndex: 'stockQty', render: (v: number) => v.toLocaleString(), sorter: (a, b) => b.stockQty - a.stockQty },
  { title: '预警科室', dataIndex: 'dept', render: (v: string) => <Tag color="orange">{v}</Tag> },
];

export default function PharmacyTraceBoardM518Page() {
  usePageTitle('药品追溯深度监控看板');
  const { trace, coldChain, expiry, loading, error, demo, load } = usePharmacyTraceBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpi = useMemo(() => {
    const coldAlarm = coldChain.filter((c) => c.alarm).length;
    const traceNormal = trace.filter((t) => t.tempStatus === 'normal').length;
    const traceRate = trace.length ? (traceNormal / trace.length) * 100 : 0;
    return { coldAlarm, traceRate };
  }, [trace, coldChain]);

  if (loading && trace.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载药品追溯看板…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="药品追溯深度监控看板（智慧服务三级 P0）"
      description="追溯 / 冷链 / 近效期 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /pharmacy/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="今日追溯药品"
              value={trace.length}
              suffix="批"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.bad}` }}>
            <Statistic
              title="冷链异常报警"
              value={kpi.coldAlarm}
              suffix="条"
              valueStyle={{ color: JL.bad }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.warn}` }}>
            <Statistic
              title="近效期药品"
              value={expiry.length}
              suffix="批"
              valueStyle={{ color: JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.ok}` }}>
            <Statistic
              title="追溯完成率"
              value={kpi.traceRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: JL.ok }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={<span style={{ color: JL.navy, fontWeight: 600 }}>药品追溯</span>}
        style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
      >
        <Table rowKey="id" columns={TRACE_COLUMNS} dataSource={trace} pagination={false} size="middle" scroll={{ x: 1100 }} />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>冷链监控</span>}
            style={{ borderTop: `3px solid ${JL.bad}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={COLD_COLUMNS} dataSource={coldChain} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={14}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>近效期预警</span>}
            style={{ borderTop: `3px solid ${JL.warn}` }}
          >
            <Table rowKey="id" columns={EXPIRY_COLUMNS} dataSource={expiry} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
