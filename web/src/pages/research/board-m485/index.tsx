/**
 * 健澜科技 jlmedaios - 科研管理看板（M485）
 * 路由：/research/board
 * 顶部 KPI：在研项目 / 年度论文 / 授权专利 / 科研到账经费
 * 在研项目 Table / 论文 Table / 专利 Table / 经费 Table
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { FundRow, PaperRow, PatentRow, ProjectRow } from '@/services/api/researchBoard';
import { useResearchBoardStore } from '@/store/researchBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
} as const;

const PROJECT_COLUMNS: ColumnsType<ProjectRow> = [
  { title: '项目名称', dataIndex: 'name', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '负责人', dataIndex: 'pi' },
  { title: '经费(元)', dataIndex: 'fund', render: (v: number) => `¥${v.toLocaleString()}`, sorter: (a, b) => b.fund - a.fund },
  {
    title: '进度',
    dataIndex: 'progress',
    render: (v: number) => (
      <Progress percent={v} size="small" style={{ width: 140 }} strokeColor={JL.blue} />
    ),
    sorter: (a, b) => b.progress - a.progress,
  },
];

const PAPER_COLUMNS: ColumnsType<PaperRow> = [
  { title: '论文题目', dataIndex: 'title', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '期刊', dataIndex: 'journal' },
  {
    title: '影响因子',
    dataIndex: 'impact',
    render: (v: number) => (
      <Tag color={v >= 2 ? 'green' : v >= 1.5 ? 'blue' : 'default'}>IF {v.toFixed(1)}</Tag>
    ),
    sorter: (a, b) => b.impact - a.impact,
  },
  { title: '年度', dataIndex: 'year', render: (v: number) => <Tag color="cyan">{v}</Tag> },
];

const PATENT_COLUMNS: ColumnsType<PatentRow> = [
  { title: '专利名称', dataIndex: 'title', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '类型',
    dataIndex: 'type',
    render: (v: string) => <Tag color={v === '发明' ? 'purple' : v === '实用新型' ? 'blue' : 'orange'}>{v}</Tag>,
  },
  { title: '授权日期', dataIndex: 'grantedAt' },
];

const FUND_COLUMNS: ColumnsType<FundRow> = [
  { title: '来源', dataIndex: 'source', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '到账(元)', dataIndex: 'received', render: (v: number) => `¥${v.toLocaleString()}`, sorter: (a, b) => b.received - a.received },
  { title: '支出(元)', dataIndex: 'spent', render: (v: number) => `¥${v.toLocaleString()}` },
  {
    title: '结余(元)',
    dataIndex: 'received',
    render: (v: number, r) => {
      const left = v - r.spent;
      return <Text style={{ color: left > 0 ? JL.ok : JL.bad }}>¥{left.toLocaleString()}</Text>;
    },
  },
];

export default function ResearchBoardM485Page() {
  usePageTitle('科研管理看板');
  const { projects, papers, patents, funds, loading, error, demo, load } = useResearchBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && projects.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载科研看板…" />
      </div>
    );
  }

  const totalFund = funds.reduce((s, r) => s + r.received, 0);

  return (
    <PageContainer
      title="科研管理看板"
      description="在研项目 / 论文 / 专利 / 科研经费一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /research/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.navy}` }}>
            <Statistic title="在研项目" value={projects.length} suffix="项" valueStyle={{ color: JL.navy }} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic title="年度论文" value={papers.length} suffix="篇" valueStyle={{ color: JL.blue }} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic title="授权专利" value={patents.length} suffix="项" valueStyle={{ color: JL.accent }} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.ok}` }}>
            <Statistic
              title="科研到账经费"
              value={totalFund}
              prefix="¥"
              valueStyle={{ color: JL.ok, fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>在研项目</span>}
            style={{ borderTop: `3px solid ${JL.navy}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={PROJECT_COLUMNS} dataSource={projects} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>科研经费</span>}
            style={{ borderTop: `3px solid ${JL.ok}` }}
          >
            <Table rowKey="id" columns={FUND_COLUMNS} dataSource={funds} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>年度论文</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={PAPER_COLUMNS} dataSource={papers} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>授权专利</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table rowKey="id" columns={PATENT_COLUMNS} dataSource={patents} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
