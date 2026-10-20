/**
 * 健澜科技 jlmedaios - 患者隐私授权管理看板（M501）
 * 路由：/security/privacy-board
 * 顶部 KPI：本月授权总数 / 隐私访问次数 / 违规事件数 / 整改完成率
 * 授权记录 / 访问日志 / 违规事件
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { AccessLogRow, ConsentRow, ViolationRow } from '@/services/api/privacyBoard';
import { usePrivacyBoardStore } from '@/store/privacyBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const CONSENT_TYPE: Record<string, { color: string; label: string }> = {
  treatment: { color: 'blue', label: '诊疗同意' },
  share: { color: 'orange', label: '数据共享' },
  research: { color: 'purple', label: '科研使用' },
  query: { color: 'green', label: '隐私查询' },
};

const VIOLATION_STATUS: Record<string, { color: string; label: string }> = {
  investigating: { color: 'orange', label: '调查中' },
  processed: { color: 'blue', label: '已处理' },
  closed: { color: 'green', label: '已关闭' },
};

const CONSENT_COLUMNS: ColumnsType<ConsentRow> = [
  { title: '患者', dataIndex: 'patient', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '授权类型',
    dataIndex: 'type',
    render: (v: string) => {
      const m = CONSENT_TYPE[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '授权时间', dataIndex: 'grantedAt' },
  { title: '有效期至', dataIndex: 'expiresAt' },
];

const ACCESS_COLUMNS: ColumnsType<AccessLogRow> = [
  { title: '访问人', dataIndex: 'accessor', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="blue">{v}</Tag> },
  { title: '访问数据类型', dataIndex: 'dataType' },
  { title: '访问时间', dataIndex: 'accessedAt' },
  { title: '用途说明', dataIndex: 'purpose' },
];

const VIOLATION_COLUMNS: ColumnsType<ViolationRow> = [
  { title: '事件描述', dataIndex: 'description', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '涉事人', dataIndex: 'involved' },
  { title: '发现时间', dataIndex: 'discoveredAt' },
  {
    title: '状态',
    dataIndex: 'status',
    render: (v: string) => {
      const m = VIOLATION_STATUS[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '整改措施', dataIndex: 'action' },
];

export default function PrivacyBoardM501Page() {
  usePageTitle('患者隐私授权管理看板');
  const { consents, accessLogs, violations, loading, error, demo, load } = usePrivacyBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && consents.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载隐私看板…" />
      </div>
    );
  }

  const closedCount = violations.filter((v) => v.status === 'closed').length;
  const processedCount = violations.filter((v) => v.status === 'processed' || v.status === 'closed').length;
  const rectificationRate = violations.length > 0 ? (processedCount / violations.length) * 100 : 0;

  return (
    <PageContainer
      title="患者隐私授权管理看板（P0 合规重点）"
      description="授权记录 / 访问日志 / 违规事件 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /privacy/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="本月授权总数"
              value={consents.length}
              suffix="条"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic
              title="隐私访问次数"
              value={accessLogs.length}
              suffix="次"
              valueStyle={{ color: JL.accent }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${violations.length > 0 ? JL.bad : JL.ok}` }}>
            <Statistic
              title="违规事件"
              value={violations.length}
              suffix={`起（已关闭 ${closedCount}）`}
              valueStyle={{ color: violations.length > 0 ? JL.bad : JL.ok }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${rectificationRate >= 80 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="整改完成率"
              value={rectificationRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: rectificationRate >= 80 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>授权记录</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={CONSENT_COLUMNS} dataSource={consents} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>违规事件</span>}
            style={{ borderTop: `3px solid ${JL.bad}` }}
          >
            <Table rowKey="id" columns={VIOLATION_COLUMNS} dataSource={violations} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>访问日志</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table rowKey="id" columns={ACCESS_COLUMNS} dataSource={accessLogs} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
