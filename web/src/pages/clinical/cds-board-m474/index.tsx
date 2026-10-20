/**
 * 健澜科技 jlmedaios - CDS 临床决策支持看板（M474）
 * 路由：/clinical/cds-board
 * 三栏：规则库（禁忌/警告/提示）+ 实时告警流 + 建议采纳率
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9；关键警示 #D9534F
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  List,
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
import type {
  CdsAdherenceRow,
  CdsAlertRow,
  CdsRuleRow,
  CdsSuggestionRow,
} from '@/services/api/cdsBoard';
import { useCdsBoardStore } from '@/store/cdsBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  danger: '#D9534F',
} as const;

const RULE_LEVEL_META: Record<CdsRuleRow['level'], { color: string; label: string }> = {
  contraindication: { color: 'red', label: '禁忌' },
  warning: { color: 'orange', label: '警告' },
  suggestion: { color: 'blue', label: '提示' },
};

const ALERT_SEVERITY_META: Record<CdsAlertRow['severity'], { color: string; label: string }> = {
  critical: { color: 'red', label: '危急' },
  high: { color: 'volcano', label: '高' },
  medium: { color: 'orange', label: '中' },
  low: { color: 'default', label: '低' },
};

const ALERT_ACK_META: Record<CdsAlertRow['ackStatus'], { color: string; label: string }> = {
  pending: { color: 'processing', label: '待签收' },
  acked: { color: 'success', label: '已签收' },
  overridden: { color: 'warning', label: '已override' },
};

const RULE_COLUMNS: ColumnsType<CdsRuleRow> = [
  { title: '规则编码', dataIndex: 'code' },
  { title: '规则名称', dataIndex: 'name', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '领域', dataIndex: 'domain', render: (v: string) => <Tag color="cyan">{v}</Tag> },
  {
    title: '级别',
    dataIndex: 'level',
    render: (v: CdsRuleRow['level']) => {
      const m = RULE_LEVEL_META[v];
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '触发条件', dataIndex: 'trigger' },
  {
    title: '状态',
    dataIndex: 'enabled',
    render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? '启用' : '停用'}</Tag>,
  },
];

const ADHERENCE_COLUMNS: ColumnsType<CdsAdherenceRow> = [
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '总数', dataIndex: 'total' },
  { title: '采纳', dataIndex: 'accepted', render: (v: number) => <Text style={{ color: '#389e0d' }}>{v}</Text> },
  { title: 'override', dataIndex: 'overridden', render: (v: number) => <Text style={{ color: 'orange' }}>{v}</Text> },
  { title: '忽略', dataIndex: 'ignored', render: (v: number) => <Text type="secondary">{v}</Text> },
  {
    title: '采纳率',
    dataIndex: 'acceptanceRate',
    render: (v: number) => (
      <div className="flex items-center gap-2">
        <Progress
          percent={v}
          size="small"
          style={{ width: 100 }}
          strokeColor={v >= 80 ? '#389e0d' : v >= 70 ? JL.blue : JL.danger}
        />
        <Text style={{ fontSize: 12 }}>{v.toFixed(1)}%</Text>
      </div>
    ),
    sorter: (a, b) => b.acceptanceRate - a.acceptanceRate,
  },
];

export default function CdsBoardM474Page() {
  usePageTitle('CDS 临床决策支持看板');
  const { rules, alerts, suggestions, adherence, loading, error, demo, load } =
    useCdsBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && rules.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载 CDS 看板…" />
      </div>
    );
  }

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const pendingAlerts = alerts.filter((a) => a.ackStatus === 'pending').length;

  return (
    <PageContainer
      title="CDS 临床决策支持看板"
      description="P0 合规：规则库 / 实时告警 / 建议采纳率"
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
          message="当前展示为 DEMO 兜底数据（BFF /cds/* 接入后自动切换为真实事件）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={8}>
          <Card style={{ borderTop: `3px solid ${JL.danger}` }}>
            <Statistic
              title="危急告警"
              value={criticalCount}
              suffix={`/ ${alerts.length}`}
              valueStyle={{ color: JL.danger }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="待签收告警"
              value={pendingAlerts}
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card style={{ borderTop: `3px solid ${JL.navy}` }}>
            <Statistic
              title="启用规则"
              value={rules.filter((r) => r.enabled).length}
              suffix={`/ ${rules.length}`}
              valueStyle={{ color: JL.navy }}
            />
          </Card>
        </Col>
      </Row>

      {/* 规则库 */}
      <Card
        title={<span style={{ color: JL.navy, fontWeight: 600 }}>CDS 规则库</span>}
        style={{ borderTop: `3px solid ${JL.navy}`, marginBottom: 16 }}
      >
        <Table
          rowKey="id"
          columns={RULE_COLUMNS}
          dataSource={rules}
          pagination={false}
          size="middle"
        />
      </Card>

      <Row gutter={[16, 16]}>
        {/* 实时告警流 */}
        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>实时告警流</span>}
            style={{ borderTop: `3px solid ${JL.danger}`, marginBottom: 16 }}
          >
            <List
              dataSource={alerts}
              renderItem={(a: CdsAlertRow) => {
                const sev = ALERT_SEVERITY_META[a.severity];
                const ack = ALERT_ACK_META[a.ackStatus];
                return (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <div className="flex flex-wrap items-center gap-2">
                          <Tag color={sev.color}>{sev.label}</Tag>
                          <Text strong style={{ color: JL.navy }}>
                            {a.ruleName}
                          </Text>
                          <Tag color={ack.color}>{ack.label}</Tag>
                          {a.demo && <Tag>演示</Tag>}
                        </div>
                      }
                      description={
                        <div>
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {a.patient} · {a.dept} · {a.firedAt}
                            </Text>
                          </div>
                          <Text style={{ fontSize: 13, color: a.severity === 'critical' ? JL.danger : 'inherit' }}>
                            {a.message}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </Card>

          {/* 医生建议 */}
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>AI 诊疗建议</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <List
              dataSource={suggestions}
              renderItem={(s: CdsSuggestionRow) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <div className="flex flex-wrap items-center gap-2">
                        <Text strong style={{ color: JL.navy }}>
                          {s.scenario}
                        </Text>
                        <Tag color="blue">{s.dept}</Tag>
                        <Progress
                          type="circle"
                          percent={s.confidence}
                          size={48}
                          strokeColor={s.confidence >= 90 ? '#389e0d' : s.confidence >= 80 ? JL.accent : 'orange'}
                        />
                      </div>
                    }
                    description={
                      <div>
                        <Text style={{ fontSize: 13 }}>{s.suggestedAction}</Text>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {s.issuedAt}
                          </Text>
                          <Tag
                            color={s.status === 'accepted' ? 'success' : s.status === 'rejected' ? 'error' : 'processing'}
                            style={{ marginLeft: 8 }}
                          >
                            {s.status === 'accepted' ? '已采纳' : s.status === 'rejected' ? '已驳回' : '待处理'}
                          </Tag>
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 建议采纳率 */}
        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>科室建议采纳率</span>}
            style={{ borderTop: `3px solid ${JL.blue}` }}
          >
            <Table
              rowKey="id"
              columns={ADHERENCE_COLUMNS}
              dataSource={adherence}
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
