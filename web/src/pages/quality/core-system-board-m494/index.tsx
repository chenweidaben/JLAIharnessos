/**
 * 健澜科技 jlmedaios - 医疗质量安全核心制度看板（M494）
 * 路由：/quality/core-system-board
 * 顶部 KPI：18 项核心制度平均落实率 / 三级查房落实率 / 交接班执行率 / 会诊及时率
 * 核心制度 / 三级查房 / 会诊
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9；达标 #52C41A、预警 #FA8C16、超标 #D9534F
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { ConsultRow, CoreSystemRow, HandoverRow } from '@/services/api/coreSystemBoard';
import { useCoreSystemBoardStore } from '@/store/coreSystemBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

function rateColor(v: number): string {
  return v >= 95 ? JL.ok : v >= 85 ? JL.warn : JL.bad;
}

const CORE_COLUMNS: ColumnsType<CoreSystemRow> = [
  { title: '制度名称', dataIndex: 'name', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '责任范围', dataIndex: 'dept', render: (v: string) => <Tag color="blue">{v}</Tag> },
  {
    title: '落实率',
    dataIndex: 'complianceRate',
    render: (v: number) => (
      <Progress percent={v} size="small" style={{ width: 180 }} strokeColor={rateColor(v)} />
    ),
    sorter: (a, b) => b.complianceRate - a.complianceRate,
  },
  { title: '本月督查次数', dataIndex: 'inspections', sorter: (a, b) => b.inspections - a.inspections },
];

const HANDOVER_COLUMNS: ColumnsType<HandoverRow> = [
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '主任医师查房率',
    dataIndex: 'profRate',
    render: (v: number) => (
      <Progress percent={v} size="small" strokeColor={rateColor(v)} />
    ),
  },
  {
    title: '主治医师查房率',
    dataIndex: 'assocProfRate',
    render: (v: number) => (
      <Progress percent={v} size="small" strokeColor={rateColor(v)} />
    ),
  },
  {
    title: '住院医师查房率',
    dataIndex: 'residentRate',
    render: (v: number) => (
      <Progress percent={v} size="small" strokeColor={rateColor(v)} />
    ),
  },
  {
    title: '交接班执行率',
    dataIndex: 'handoverRate',
    render: (v: number) => (
      <Text style={{ color: rateColor(v), fontWeight: 600 }}>{v.toFixed(1)}%</Text>
    ),
  },
];

const CONSULT_COLUMNS: ColumnsType<ConsultRow> = [
  { title: '会诊类型', dataIndex: 'type', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '及时率',
    dataIndex: 'timelyRate',
    render: (v: number) => (
      <Progress percent={v} size="small" style={{ width: 180 }} strokeColor={rateColor(v)} />
    ),
    sorter: (a, b) => b.timelyRate - a.timelyRate,
  },
  {
    title: '超时会诊数',
    dataIndex: 'overdue',
    render: (v: number) => (v > 0 ? <Tag color="red">{v}</Tag> : <Tag color="green">0</Tag>),
  },
];

export default function CoreSystemBoardM494Page() {
  usePageTitle('核心制度看板');
  const { systems, handovers, consults, loading, error, demo, load } = useCoreSystemBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && systems.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载核心制度看板…" />
      </div>
    );
  }

  const avgCompliance = systems.length > 0
    ? systems.reduce((s, r) => s + r.complianceRate, 0) / systems.length
    : 0;
  const avgHandover = handovers.length > 0
    ? handovers.reduce((s, r) => s + r.handoverRate, 0) / handovers.length
    : 0;
  const avgProf = handovers.length > 0
    ? handovers.reduce((s, r) => s + r.profRate, 0) / handovers.length
    : 0;
  const avgConsult = consults.length > 0
    ? consults.reduce((s, r) => s + r.timelyRate, 0) / consults.length
    : 0;

  return (
    <PageContainer
      title="医疗质量安全核心制度看板"
      description="18 项核心制度 / 三级查房 / 交接班 / 会诊 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /quality/core-systems 等端点接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${rateColor(avgCompliance)}` }}>
            <Statistic
              title="核心制度平均落实率"
              value={avgCompliance}
              precision={1}
              suffix="%"
              valueStyle={{ color: rateColor(avgCompliance) }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${rateColor(avgProf)}` }}>
            <Statistic
              title="三级查房（主任）落实率"
              value={avgProf}
              precision={1}
              suffix="%"
              valueStyle={{ color: rateColor(avgProf) }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${rateColor(avgHandover)}` }}>
            <Statistic
              title="交接班执行率"
              value={avgHandover}
              precision={1}
              suffix="%"
              valueStyle={{ color: rateColor(avgHandover) }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${rateColor(avgConsult)}` }}>
            <Statistic
              title="会诊及时率"
              value={avgConsult}
              precision={1}
              suffix="%"
              valueStyle={{ color: rateColor(avgConsult) }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>18 项核心制度落实率</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={CORE_COLUMNS} dataSource={systems} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>会诊及时率</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table rowKey="id" columns={CONSULT_COLUMNS} dataSource={consults} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>三级查房 / 交接班（按科室）</span>}
            style={{ borderTop: `3px solid ${JL.ok}` }}
          >
            <Table rowKey="id" columns={HANDOVER_COLUMNS} dataSource={handovers} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
