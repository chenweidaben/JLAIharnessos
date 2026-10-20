/**
 * 健澜科技 jlmedaios - 智慧服务三级运营总览看板（M479）
 * 路由：/smart-service/board
 * 顶部 KPI：预约挂号量 / 诊间支付笔数 / 报告查询率 / 随访完成率
 * 四栏明细：渠道分布 / 支付方式 / 查询时效 / 随访人群
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9；达标 #52C41A / 未达标 #FA8C16
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
import type {
  AppointmentRow,
  FollowupRow,
  PaymentRow,
  ReportQueryRow,
} from '@/services/api/smartServiceBoard';
import { useSmartServiceBoardStore } from '@/store/smartServiceBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  warn: '#FA8C16',
} as const;

const APPOINTMENT_COLUMNS: ColumnsType<AppointmentRow> = [
  { title: '渠道', dataIndex: 'channel', render: (v: string) => <Tag color="blue">{v}</Tag> },
  { title: '累计预约', dataIndex: 'total', sorter: (a, b) => b.total - a.total },
  { title: '今日预约', dataIndex: 'today' },
  {
    title: '预约率',
    dataIndex: 'rate',
    render: (v: number) => (
      <Progress
        percent={v}
        size="small"
        style={{ width: 140 }}
        strokeColor={v >= 70 ? JL.ok : JL.warn}
      />
    ),
    sorter: (a, b) => b.rate - a.rate,
  },
];

const PAYMENT_COLUMNS: ColumnsType<PaymentRow> = [
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '支付方式', dataIndex: 'channel', render: (v: string) => <Tag color="cyan">{v}</Tag> },
  { title: '笔数', dataIndex: 'count', sorter: (a, b) => b.count - a.count },
  { title: '金额', dataIndex: 'amount', render: (v: number) => `¥${v.toLocaleString()}` },
  { title: '笔均', dataIndex: 'avgAmount', render: (v: number) => `¥${v}` },
];

const REPORT_COLUMNS: ColumnsType<ReportQueryRow> = [
  { title: '报告类型', dataIndex: 'type', render: (v: string) => <Tag color="purple">{v}</Tag> },
  { title: '总数', dataIndex: 'total' },
  { title: '已查询', dataIndex: 'queried' },
  {
    title: '查询率',
    dataIndex: 'queryRate',
    render: (v: number) => (
      <Progress
        percent={v}
        size="small"
        style={{ width: 140 }}
        strokeColor={v >= 85 ? JL.ok : JL.warn}
      />
    ),
    sorter: (a, b) => b.queryRate - a.queryRate,
  },
  {
    title: '平均出具时长(分钟)',
    dataIndex: 'avgQueryMinutes',
    render: (v: number) => (
      <Text style={{ color: v <= 20 ? JL.ok : JL.warn }}>{v}</Text>
    ),
    sorter: (a, b) => a.avgQueryMinutes - b.avgQueryMinutes,
  },
];

const FOLLOWUP_COLUMNS: ColumnsType<FollowupRow> = [
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '应随访', dataIndex: 'should' },
  { title: '已随访', dataIndex: 'done' },
  {
    title: '完成率',
    dataIndex: 'rate',
    render: (v: number) => (
      <Progress
        percent={v}
        size="small"
        style={{ width: 140 }}
        strokeColor={v >= 85 ? JL.ok : JL.warn}
      />
    ),
    sorter: (a, b) => b.rate - a.rate,
  },
  {
    title: '投诉数',
    dataIndex: 'complaintCount',
    render: (v: number) =>
      v > 0 ? <Tag color="red">{v}</Tag> : <Tag color="success">0</Tag>,
  },
];

export default function SmartServiceBoardM479Page() {
  usePageTitle('智慧服务三级运营总览');
  const { appointments, payments, reportQueries, followups, loading, error, demo, load } =
    useSmartServiceBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && appointments.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载智慧服务看板…" />
      </div>
    );
  }

  const totalAppt = appointments.reduce((s, a) => s + a.today, 0);
  const totalPay = payments.reduce((s, p) => s + p.count, 0);
  const avgQueryRate =
    reportQueries.length > 0
      ? reportQueries.reduce((s, r) => s + r.queryRate, 0) / reportQueries.length
      : 0;
  const avgFollowupRate =
    followups.length > 0
      ? followups.reduce((s, f) => s + f.rate, 0) / followups.length
      : 0;

  return (
    <PageContainer
      title="智慧服务三级运营总览"
      description="预约挂号 / 诊间支付 / 报告查询 / 随访完成（三级评级口径）"
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
          message="当前展示为 DEMO 兜底数据（BFF /smart-service/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={6}>
          <Card style={{ borderTop: `3px solid ${JL.navy}` }}>
            <Statistic title="今日预约挂号" value={totalAppt} suffix="人次" valueStyle={{ color: JL.navy }} />
          </Card>
        </Col>
        <Col xs={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic title="诊间支付笔数" value={totalPay} suffix="笔" valueStyle={{ color: JL.blue }} />
          </Card>
        </Col>
        <Col xs={6}>
          <Card style={{ borderTop: `3px solid ${avgQueryRate >= 85 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="报告查询率"
              value={avgQueryRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: avgQueryRate >= 85 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={6}>
          <Card style={{ borderTop: `3px solid ${avgFollowupRate >= 85 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="随访完成率"
              value={avgFollowupRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: avgFollowupRate >= 85 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>预约渠道分布</span>}
            style={{ borderTop: `3px solid ${JL.navy}`, marginBottom: 16 }}
          >
            <Table
              rowKey="id"
              columns={APPOINTMENT_COLUMNS}
              dataSource={appointments}
              pagination={false}
              size="middle"
            />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>支付方式与金额</span>}
            style={{ borderTop: `3px solid ${JL.blue}` }}
          >
            <Table
              rowKey="id"
              columns={PAYMENT_COLUMNS}
              dataSource={payments}
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>报告查询时效</span>}
            style={{ borderTop: `3px solid ${JL.accent}`, marginBottom: 16 }}
          >
            <Table
              rowKey="id"
              columns={REPORT_COLUMNS}
              dataSource={reportQueries}
              pagination={false}
              size="middle"
            />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>随访完成情况</span>}
            style={{ borderTop: `3px solid ${JL.ok}` }}
          >
            <Table
              rowKey="id"
              columns={FOLLOWUP_COLUMNS}
              dataSource={followups}
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
