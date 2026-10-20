/**
 * 健澜科技 jlmedaios - 病历版本管理看板（M506）
 * 路由：/emr/version-board
 * 顶部 KPI：本月修订病历 / 平均修订轮次 / 版本可追溯率 / 版本差异字段数
 * 版本列表 / 版本差异
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { DiffRow, VersionRow } from '@/services/api/emrVersionBoard';
import { useEmrVersionBoardStore } from '@/store/emrVersionBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

function versionColor(v: string): string {
  if (v.startsWith('v1.')) return 'default';
  if (v.startsWith('v2.')) return 'blue';
  if (v.startsWith('v3.')) return 'green';
  return 'default';
}

const CHANGE_TYPE: Record<string, { color: string; label: string }> = {
  create: { color: 'blue', label: '新建' },
  revise: { color: 'orange', label: '修订' },
  review: { color: 'green', label: '审核' },
  sign: { color: 'purple', label: '签发' },
};

const LIST_COLUMNS: ColumnsType<VersionRow> = [
  { title: '病历 ID', dataIndex: 'emrId', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '版本', dataIndex: 'version', render: (v: string) => <Tag color={versionColor(v)}>{v}</Tag> },
  { title: '修改人', dataIndex: 'author' },
  { title: '修改时间', dataIndex: 'modifiedAt' },
  {
    title: '修改类型',
    dataIndex: 'changeType',
    render: (v: string) => {
      const m = CHANGE_TYPE[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
];

const DIFF_COLUMNS: ColumnsType<DiffRow> = [
  { title: '字段', dataIndex: 'field', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '旧值',
    dataIndex: 'oldValue',
    render: (v: string) => <Text style={{ color: JL.bad }}>{v}</Text>,
  },
  {
    title: '新值',
    dataIndex: 'newValue',
    render: (v: string) => <Text style={{ color: JL.ok, fontWeight: 600 }}>{v}</Text>,
  },
  { title: '修改人', dataIndex: 'author' },
  { title: '修改时间', dataIndex: 'modifiedAt' },
];

export default function EmrVersionBoardM506Page() {
  usePageTitle('病历版本管理看板');
  const { list, diffs, stats, loading, error, demo, load } = useEmrVersionBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && list.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载版本看板…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="病历版本管理看板（电子病历五级 P0 合规重点）"
      description="版本列表 / 版本差异 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /emr/version/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="本月修订病历"
              value={stats?.monthlyRevised ?? list.length}
              suffix="份"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic
              title="平均修订轮次"
              value={stats?.avgRounds ?? 0}
              precision={1}
              suffix="轮"
              valueStyle={{ color: JL.accent }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${(stats?.traceabilityRate ?? 0) >= 99 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="版本可追溯率"
              value={stats?.traceabilityRate ?? 0}
              precision={2}
              suffix="%"
              valueStyle={{ color: (stats?.traceabilityRate ?? 0) >= 99 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.warn}` }}>
            <Statistic
              title="版本差异字段数"
              value={stats?.diffFieldCount ?? diffs.length}
              suffix="个"
              valueStyle={{ color: JL.warn }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>版本列表</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={LIST_COLUMNS} dataSource={list} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>版本差异</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table rowKey="id" columns={DIFF_COLUMNS} dataSource={diffs} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
