/**
 * 健澜科技 jlmedaios - 护理 NQI 敏感质量指标监控看板（M510）
 * 路由：/nursing/nqi-board
 * 顶部 KPI：本月不良事件 / 发生率 / 预防执行率 / 疼痛评估覆盖率
 * 不良事件 / 预防措施
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Spin, Statistic, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { IncidentRow, PreventionRow } from '@/services/api/nursingNqiBoard';
import { useNursingNqiBoardStore } from '@/store/nursingNqiBoardStore';

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const INCIDENT_TYPE: Record<string, { color: string; label: string }> = {
  fall: { color: 'orange', label: '跌倒' },
  pressureUlcer: { color: 'red', label: '压疮' },
  tubeDisplacement: { color: 'purple', label: '管路滑脱' },
  restraint: { color: 'blue', label: '约束' },
  painUnassessed: { color: 'green', label: '疼痛未评' },
};

const SEVERITY: Record<string, { color: string; label: string }> = {
  light: { color: 'green', label: '轻' },
  medium: { color: 'orange', label: '中' },
  heavy: { color: 'red', label: '重' },
};

const PREVENTION_MEASURE: Record<string, { color: string; label: string }> = {
  turning: { color: 'blue', label: '翻身' },
  bedRails: { color: 'orange', label: '床栏' },
  identification: { color: 'purple', label: '标识' },
  restraintAssess: { color: 'cyan', label: '约束评估' },
  painReassess: { color: 'green', label: '疼痛复评' },
};

function rateTag(r: number) {
  if (r >= 95) return <Tag color="green">{r.toFixed(1)}%</Tag>;
  if (r >= 85) return <Tag color="orange">{r.toFixed(1)}%</Tag>;
  return <Tag color="red">{r.toFixed(1)}%</Tag>;
}

const INCIDENT_COLUMNS: ColumnsType<IncidentRow> = [
  {
    title: '事件类型',
    dataIndex: 'type',
    render: (v: string) => {
      const m = INCIDENT_TYPE[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '发生科室', dataIndex: 'dept', render: (v: string) => <Tag color="blue">{v}</Tag> },
  {
    title: '严重程度',
    dataIndex: 'severity',
    render: (v: string) => {
      const m = SEVERITY[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
];

const PREVENTION_COLUMNS: ColumnsType<PreventionRow> = [
  {
    title: '措施类型',
    dataIndex: 'measure',
    render: (v: string) => {
      const m = PREVENTION_MEASURE[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  {
    title: '执行率',
    dataIndex: 'rate',
    render: (v: number) => (
      <>
        <Progress percent={v} size="small" style={{ width: 120, marginRight: 8 }} />
        {rateTag(v)}
      </>
    ),
    sorter: (a, b) => b.rate - a.rate,
  },
];

export default function NursingNqiBoardM510Page() {
  usePageTitle('护理 NQI 敏感质量指标看板');
  const { incidents, prevention, stats, loading, error, demo, load } = useNursingNqiBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && incidents.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载 NQI 看板…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="护理 NQI 敏感质量指标监控看板（智慧护理 P0）"
      description="不良事件 / 预防措施 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /nursing/nqi/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="本月不良事件"
              value={stats?.monthlyIncidents ?? incidents.length}
              suffix="件"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.warn}` }}>
            <Statistic
              title="发生率"
              value={stats?.incidentRate ?? 0}
              precision={2}
              suffix="%"
              valueStyle={{ color: JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.ok}` }}>
            <Statistic
              title="预防执行率"
              value={stats?.preventionRate ?? 0}
              precision={1}
              suffix="%"
              valueStyle={{ color: JL.ok }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid #722ED1` }}>
            <Statistic
              title="疼痛评估覆盖率"
              value={stats?.painAssessmentCoverage ?? 0}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#722ED1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>本月不良事件</span>}
            style={{ borderTop: `3px solid ${JL.bad}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={INCIDENT_COLUMNS} dataSource={incidents} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={14}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>预防措施执行</span>}
            style={{ borderTop: `3px solid ${JL.ok}` }}
          >
            <Table rowKey="id" columns={PREVENTION_COLUMNS} dataSource={prevention} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
