/**
 * 健澜科技 jlmedaios - 病案管理看板（M491）
 * 路由：/emr/archive-board
 * 顶部 KPI：待归档 / 已归档 / 逾期未归档 / 借阅在借
 * 归档进度 / 借阅 / 复印
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9；逾期 #D9534F、达标 #52C41A
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { ArchiveRow, BorrowRow, CopyRow } from '@/services/api/medicalRecordBoard';
import { useMedicalRecordBoardStore } from '@/store/medicalRecordBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const BORROW_STATUS: Record<string, { color: string; label: string }> = {
  borrowed: { color: 'blue', label: '在借' },
  returned: { color: 'green', label: '已还' },
  overdue: { color: 'red', label: '逾期' },
};

const ARCHIVE_COLUMNS: ColumnsType<ArchiveRow> = [
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '应归档', dataIndex: 'should', sorter: (a, b) => b.should - a.should },
  { title: '已归档', dataIndex: 'archived' },
  {
    title: '归档率',
    dataIndex: 'rate',
    render: (v: number) => (
      <Progress
        percent={v}
        size="small"
        style={{ width: 140 }}
        strokeColor={v >= 95 ? JL.ok : v >= 90 ? JL.warn : JL.bad}
      />
    ),
    sorter: (a, b) => b.rate - a.rate,
  },
  {
    title: '逾期',
    dataIndex: 'overdue',
    render: (v: number) => (v > 0 ? <Tag color="red">{v}</Tag> : <Tag color="green">0</Tag>),
  },
];

const BORROW_COLUMNS: ColumnsType<BorrowRow> = [
  { title: '病案号', dataIndex: 'mrn', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '借阅人', dataIndex: 'borrower' },
  { title: '借出日期', dataIndex: 'borrowedAt' },
  { title: '应还日期', dataIndex: 'dueAt' },
  {
    title: '状态',
    dataIndex: 'status',
    render: (v: string) => {
      const m = BORROW_STATUS[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
];

const COPY_COLUMNS: ColumnsType<CopyRow> = [
  { title: '类型', dataIndex: 'type', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '申请数', dataIndex: 'applied', sorter: (a, b) => b.applied - a.applied },
  { title: '办结数', dataIndex: 'done' },
  { title: '费用(元)', dataIndex: 'fee', render: (v: number) => `¥${v.toLocaleString()}` },
];

export default function ArchiveBoardM491Page() {
  usePageTitle('病案管理看板');
  const { archive, borrow, copy, loading, error, demo, load } = useMedicalRecordBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && archive.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载病案看板…" />
      </div>
    );
  }

  const totalShould = archive.reduce((s, r) => s + r.should, 0);
  const totalArchived = archive.reduce((s, r) => s + r.archived, 0);
  const pending = totalShould - totalArchived;
  const overdue = archive.reduce((s, r) => s + r.overdue, 0);
  const borrowedActive = borrow.filter((r) => r.status === 'borrowed' || r.status === 'overdue').length;

  return (
    <PageContainer
      title="病案管理看板"
      description="归档进度 / 借阅 / 复印 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /emr/archive-* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic title="待归档" value={pending} suffix="份" valueStyle={{ color: JL.blue }} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.ok}` }}>
            <Statistic title="已归档" value={totalArchived} suffix="份" valueStyle={{ color: JL.ok }} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${overdue > 0 ? JL.bad : JL.ok}` }}>
            <Statistic
              title="逾期未归档"
              value={overdue}
              suffix="份"
              valueStyle={{ color: overdue > 0 ? JL.bad : JL.ok }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic
              title="借阅在借"
              value={borrowedActive}
              suffix="份"
              valueStyle={{ color: JL.accent }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>科室归档进度</span>}
            style={{ borderTop: `3px solid ${JL.ok}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={ARCHIVE_COLUMNS} dataSource={archive} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>病历复印</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table rowKey="id" columns={COPY_COLUMNS} dataSource={copy} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>病案借阅</span>}
            style={{ borderTop: `3px solid ${JL.bad}` }}
          >
            <Table rowKey="id" columns={BORROW_COLUMNS} dataSource={borrow} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
