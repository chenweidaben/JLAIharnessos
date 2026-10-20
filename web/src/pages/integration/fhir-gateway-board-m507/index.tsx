/**
 * 健澜科技 jlmedaios - FHIR 资源交换监控看板（M507）
 * 路由：/integration/fhir-gateway-board
 * 顶部 KPI：今日 FHIR 交换总量 / Patient 资源数 / Observation 资源数 / 一致性成功率
 * Patient 资源 / Observation 资源 / 一致性监控
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { ConsistencyRow, ObservationResource, PatientResource } from '@/services/api/fhirGatewayBoard';
import { useFhirGatewayBoardStore } from '@/store/fhirGatewayBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

function rateColor(r: number): string {
  if (r >= 99) return JL.ok;
  if (r >= 95) return JL.warn;
  return JL.bad;
}

function rateTag(r: number) {
  if (r >= 99) return <Tag color="green">{r.toFixed(1)}%</Tag>;
  if (r >= 95) return <Tag color="orange">{r.toFixed(1)}%</Tag>;
  return <Tag color="red">{r.toFixed(1)}%</Tag>;
}

const PATIENT_COLUMNS: ColumnsType<PatientResource> = [
  { title: 'resourceType', dataIndex: 'resourceType', render: (v: string) => <Tag color="blue">{v}</Tag> },
  { title: '资源 ID', dataIndex: 'fhirId', render: (v: string) => <Text code style={{ color: JL.navy }}>{v}</Text> },
  { title: '姓名', dataIndex: 'name', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '性别',
    dataIndex: 'gender',
    render: (v: string) => (v === 'male' ? <Tag color="blue">male</Tag> : <Tag color="pink">female</Tag>),
  },
  { title: '出生年月', dataIndex: 'birthDate' },
];

const OBSERVATION_COLUMNS: ColumnsType<ObservationResource> = [
  { title: 'resourceType', dataIndex: 'resourceType', render: (v: string) => <Tag color="cyan">{v}</Tag> },
  { title: '资源 ID', dataIndex: 'fhirId', render: (v: string) => <Text code style={{ color: JL.navy }}>{v}</Text> },
  { title: '检验项目', dataIndex: 'code', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '数值+单位', dataIndex: 'value' },
  {
    title: '状态',
    dataIndex: 'status',
    render: (v: string) =>
      v === 'final' ? <Tag color="green">final</Tag> : <Tag color="orange">registered</Tag>,
  },
];

const CONSISTENCY_COLUMNS: ColumnsType<ConsistencyRow> = [
  { title: '资源类型', dataIndex: 'resourceType', render: (v: string) => <Tag color="geekblue">{v}</Tag> },
  { title: '交换条数', dataIndex: 'count', sorter: (a, b) => b.count - a.count },
  {
    title: '成功率',
    dataIndex: 'successRate',
    render: (v: number) => rateTag(v),
    sorter: (a, b) => a.successRate - b.successRate,
  },
];

export default function FhirGatewayBoardM507Page() {
  usePageTitle('FHIR 资源交换监控看板');
  const { patients, observations, consistency, loading, error, demo, load } = useFhirGatewayBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpi = useMemo(() => {
    const totalCount =
      consistency.reduce((acc, c) => acc + c.count, 0) ||
      patients.length + observations.length;
    const weighted =
      consistency.reduce((acc, c) => acc + c.successRate * c.count, 0) /
      (consistency.reduce((acc, c) => acc + c.count, 0) || 1);
    return { totalCount, weighted };
  }, [patients, observations, consistency]);

  if (loading && patients.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载 FHIR 网关看板…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="FHIR 资源交换监控看板（互联互通四甲 P0）"
      description="Patient / Observation / 一致性 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /fhir/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="今日 FHIR 交换总量"
              value={kpi.totalCount}
              suffix="条"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic
              title="Patient 资源数"
              value={patients.length}
              suffix="份"
              valueStyle={{ color: JL.accent }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.ok}` }}>
            <Statistic
              title="Observation 资源数"
              value={observations.length}
              suffix="条"
              valueStyle={{ color: JL.ok }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${rateColor(kpi.weighted)}` }}>
            <Statistic
              title="一致性成功率"
              value={kpi.weighted}
              precision={2}
              suffix="%"
              valueStyle={{ color: rateColor(kpi.weighted) }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>Patient 资源</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={PATIENT_COLUMNS} dataSource={patients} pagination={false} size="small" />
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>Observation 资源</span>}
            style={{ borderTop: `3px solid ${JL.accent}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={OBSERVATION_COLUMNS} dataSource={observations} pagination={false} size="small" />
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>一致性监控</span>}
            style={{ borderTop: `3px solid ${JL.ok}` }}
          >
            <Table rowKey="id" columns={CONSISTENCY_COLUMNS} dataSource={consistency} pagination={false} size="small" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
