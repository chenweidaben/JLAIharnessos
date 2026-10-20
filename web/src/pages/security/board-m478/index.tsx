/**
 * 健澜科技 jlmedaios - 安全与隐私合规看板（M478）
 * 路由：/security/board
 * 顶部 KPI：敏感+核心数据条数 / 异常事件数 / 未闭环异常数
 * 中部：隐私分级 Table（公开/内部/敏感/核心四级 Tag + 条数 Progress）
 * 底部：异常行为 Table（异常登录/越权访问/批量导出，严重度色 Tag）
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9；高危 #D9534F
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Progress,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { AnomalyRow, PrivacyRow } from '@/services/api/securityBoard';
import { useSecurityBoardStore } from '@/store/securityBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  danger: '#D9534F',
} as const;

const LEVEL_META: Record<PrivacyRow['level'], { color: string; label: string }> = {
  public: { color: 'default', label: '公开' },
  internal: { color: 'blue', label: '内部' },
  sensitive: { color: 'orange', label: '敏感' },
  core: { color: 'red', label: '核心' },
};

const ANOMALY_TYPE_META: Record<AnomalyRow['type'], { color: string; label: string }> = {
  'abnormal-login': { color: 'volcano', label: '异常登录' },
  'unauthorized-access': { color: 'orange', label: '越权访问' },
  'bulk-export': { color: 'purple', label: '批量导出' },
};

const SEVERITY_META: Record<AnomalyRow['severity'], { color: string; label: string }> = {
  critical: { color: 'red', label: '危急' },
  high: { color: 'volcano', label: '高' },
  medium: { color: 'orange', label: '中' },
  low: { color: 'default', label: '低' },
};

const STATUS_META: Record<AnomalyRow['status'], { color: string; label: string }> = {
  open: { color: 'processing', label: '待闭环' },
  acknowledged: { color: 'warning', label: '已确认' },
  closed: { color: 'success', label: '已闭环' },
};

const PRIVACY_COLUMNS: ColumnsType<PrivacyRow> = [
  { title: '业务域', dataIndex: 'domain', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '数据对象', dataIndex: 'dataClass' },
  {
    title: '分级',
    dataIndex: 'level',
    render: (v: PrivacyRow['level']) => {
      const m = LEVEL_META[v];
      return <Tag color={m.color}>{m.label}</Tag>;
    },
    filters: Object.entries(LEVEL_META).map(([k, v]) => ({ text: v.label, value: k })),
    onFilter: (v, r) => r.level === v,
  },
  {
    title: '条数',
    dataIndex: 'count',
    render: (v: number, r) => {
      const max = 320000;
      const pct = Math.min(100, (v / max) * 100);
      const color =
        r.level === 'core' ? JL.danger : r.level === 'sensitive' ? 'orange' : JL.accent;
      return (
        <div className="flex items-center gap-2">
          <Progress percent={pct} size="small" style={{ width: 120 }} strokeColor={color} />
          <Text style={{ fontSize: 12 }}>{v.toLocaleString()}</Text>
        </div>
      );
    },
    sorter: (a, b) => b.count - a.count,
  },
  {
    title: '加密',
    dataIndex: 'encryption',
    render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? '已加密' : '未加密'}</Tag>,
  },
  {
    title: '脱敏',
    dataIndex: 'maskField',
    render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? '已脱敏' : '未脱敏'}</Tag>,
  },
  { title: '责任 owner', dataIndex: 'owner' },
];

const ANOMALY_COLUMNS: ColumnsType<AnomalyRow> = [
  {
    title: '类型',
    dataIndex: 'type',
    render: (v: AnomalyRow['type']) => {
      const m = ANOMALY_TYPE_META[v];
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '行为人', dataIndex: 'actor' },
  { title: '来源 IP', dataIndex: 'sourceIp', render: (v: string) => <Text code>{v}</Text> },
  { title: '目标', dataIndex: 'target' },
  {
    title: '严重度',
    dataIndex: 'severity',
    render: (v: AnomalyRow['severity']) => {
      const m = SEVERITY_META[v];
      return <Tag color={m.color}>{m.label}</Tag>;
    },
    sorter: (a, b) => a.severity.localeCompare(b.severity),
  },
  { title: '发生时间', dataIndex: 'happenedAt' },
  {
    title: '状态',
    dataIndex: 'status',
    render: (v: AnomalyRow['status']) => {
      const m = STATUS_META[v];
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '详情', dataIndex: 'detail', render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> },
];

export default function SecurityBoardM478Page() {
  usePageTitle('安全与隐私合规看板');
  const { privacy, anomalies, loading, error, demo, load } = useSecurityBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && privacy.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载安全看板…" />
      </div>
    );
  }

  const sensitiveCount = privacy
    .filter((p) => p.level === 'sensitive' || p.level === 'core')
    .reduce((s, p) => s + p.count, 0);
  const openAnomalies = anomalies.filter((a) => a.status === 'open').length;
  const criticalAnomalies = anomalies.filter((a) => a.severity === 'critical').length;

  return (
    <PageContainer
      title="安全与隐私合规看板"
      description="隐私分级 + 审计异常行为（P0 合规：数据安全 / 个人信息保护）"
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>
          刷新
        </Button>
      }
    >
      {error && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={error}
          action={
            <Button size="small" onClick={() => void load()}>
              重试
            </Button>
          }
        />
      )}
      {demo && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="当前展示为 DEMO 兜底数据（BFF /security/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={8}>
          <Card style={{ borderTop: `3px solid ${JL.danger}` }}>
            <Statistic
              title="敏感+核心数据条数"
              value={sensitiveCount}
              valueStyle={{ color: JL.danger }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card style={{ borderTop: `3px solid #cf1322` }}>
            <Statistic
              title="危急异常事件"
              value={criticalAnomalies}
              suffix={`/ ${anomalies.length}`}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="未闭环异常"
              value={openAnomalies}
              suffix={`/ ${anomalies.length}`}
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={<span style={{ color: JL.navy, fontWeight: 600 }}>数据隐私分级</span>}
        style={{ borderTop: `3px solid ${JL.navy}`, marginBottom: 16 }}
      >
        <Table
          rowKey="id"
          columns={PRIVACY_COLUMNS}
          dataSource={privacy}
          pagination={false}
          size="middle"
        />
      </Card>

      <Card
        title={<span style={{ color: JL.navy, fontWeight: 600 }}>审计异常行为</span>}
        style={{ borderTop: `3px solid ${JL.danger}` }}
      >
        <Table
          rowKey="id"
          columns={ANOMALY_COLUMNS}
          dataSource={anomalies}
          pagination={false}
          size="middle"
        />
      </Card>
    </PageContainer>
  );
}
