/**
 * 健澜科技 jlmedaios - 门诊预约管理看板（M503）
 * 路由：/outpatient/appointment-board
 * 顶部 KPI：今日预约总量 / 预约率 / 爽约率 / 分时预约占比
 * 出诊排班 / 预约记录
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { RecordRow, ScheduleRow } from '@/services/api/appointmentBoard';
import { useAppointmentBoardStore } from '@/store/appointmentBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const TITLE_META: Record<string, { color: string; label: string }> = {
  chief: { color: 'gold', label: '主任医师' },
  associate: { color: 'blue', label: '副主任医师' },
  attending: { color: 'green', label: '主治医师' },
};

const SOURCE_META: Record<string, { color: string; label: string }> = {
  wechat: { color: 'green', label: '微信' },
  alipay: { color: 'blue', label: '支付宝' },
  kiosk: { color: 'orange', label: '自助机' },
  window: { color: 'default', label: '窗口' },
  phone114: { color: 'purple', label: '114' },
};

const STATUS_META: Record<string, { color: string; label: string }> = {
  booked: { color: 'blue', label: '已预约' },
  arrived: { color: 'green', label: '已到诊' },
  cancelled: { color: 'orange', label: '已取消' },
  noshow: { color: 'red', label: '爽约' },
};

const SCHEDULE_COLUMNS: ColumnsType<ScheduleRow> = [
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="blue">{v}</Tag> },
  { title: '医师', dataIndex: 'doctor', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '职称',
    dataIndex: 'title',
    render: (v: string) => {
      const m = TITLE_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '挂号费(元)', dataIndex: 'fee', sorter: (a, b) => b.fee - a.fee },
  {
    title: '剩余号源',
    dataIndex: 'remaining',
    render: (v: number) => (v <= 10 ? <Tag color="red">{v}</Tag> : <Tag color="green">{v}</Tag>),
    sorter: (a, b) => a.remaining - b.remaining,
  },
];

const RECORD_COLUMNS: ColumnsType<RecordRow> = [
  { title: '患者', dataIndex: 'patient', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '科室', dataIndex: 'dept' },
  { title: '医师', dataIndex: 'doctor' },
  { title: '预约时间', dataIndex: 'time' },
  {
    title: '来源',
    dataIndex: 'source',
    render: (v: string) => {
      const m = SOURCE_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  {
    title: '状态',
    dataIndex: 'status',
    render: (v: string) => {
      const m = STATUS_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
];

export default function AppointmentBoardM503Page() {
  usePageTitle('门诊预约管理看板');
  const { schedule, records, stats, loading, error, demo, load } = useAppointmentBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && schedule.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载预约看板…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="门诊预约管理看板（智慧服务三级 P0 合规重点）"
      description="出诊排班 / 预约记录 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /appointment/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="今日预约总量"
              value={stats?.totalToday ?? 0}
              suffix="人次"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic
              title="预约率"
              value={stats?.bookingRate ?? 0}
              precision={1}
              suffix="%"
              valueStyle={{ color: JL.accent }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${(stats?.noshowRate ?? 0) <= 5 ? JL.ok : JL.bad}` }}>
            <Statistic
              title="爽约率"
              value={stats?.noshowRate ?? 0}
              precision={2}
              suffix="%"
              valueStyle={{ color: (stats?.noshowRate ?? 0) <= 5 ? JL.ok : JL.bad }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.ok}` }}>
            <Statistic
              title="分时预约占比"
              value={stats?.timeSlotRatio ?? 0}
              precision={1}
              suffix="%"
              valueStyle={{ color: JL.ok }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>今日出诊排班</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={SCHEDULE_COLUMNS} dataSource={schedule} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={14}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>今日预约记录</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table rowKey="id" columns={RECORD_COLUMNS} dataSource={records} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
