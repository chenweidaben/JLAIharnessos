/**
 * 健澜科技 jlmedaios - 设备管理看板（M486）
 * 路由：/equipment/board
 * 顶部 KPI：设备总数 / 在用率 / 故障设备数 / 平均响应时间
 * 设备生命周期 / 维修 / 使用率
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9；故障 #D9534F、达标 #52C41A
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { LifecycleRow, MaintenanceRow, UtilizationRow } from '@/services/api/equipmentBoard';
import { useEquipmentBoardStore } from '@/store/equipmentBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const STATUS_META: Record<string, { color: string; label: string }> = {
  'in-use': { color: 'green', label: '在用' },
  standby: { color: 'blue', label: '备用' },
  repair: { color: 'red', label: '维修中' },
  retired: { color: 'default', label: '已报废' },
};

const MAINT_STATUS: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待派单' },
  processing: { color: 'cyan', label: '维修中' },
  done: { color: 'green', label: '已完成' },
  warranty: { color: 'purple', label: '保修' },
};

const LIFECYCLE_COLUMNS: ColumnsType<LifecycleRow> = [
  { title: '设备', dataIndex: 'name', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '型号', dataIndex: 'model' },
  {
    title: '状态',
    dataIndex: 'status',
    render: (v: string) => {
      const m = STATUS_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '购置日期', dataIndex: 'purchasedAt' },
  { title: '原值(元)', dataIndex: 'value', render: (v: number) => `¥${v.toLocaleString()}`, sorter: (a, b) => b.value - a.value },
];

const MAINT_COLUMNS: ColumnsType<MaintenanceRow> = [
  { title: '设备', dataIndex: 'device', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '故障类型', dataIndex: 'fault' },
  {
    title: '维修状态',
    dataIndex: 'status',
    render: (v: string) => {
      const m = MAINT_STATUS[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '费用(元)', dataIndex: 'cost', render: (v: number) => `¥${v.toLocaleString()}`, sorter: (a, b) => b.cost - a.cost },
];

const UTIL_COLUMNS: ColumnsType<UtilizationRow> = [
  { title: '设备', dataIndex: 'device', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '本月使用小时', dataIndex: 'hoursInUse', sorter: (a, b) => b.hoursInUse - a.hoursInUse },
  {
    title: '使用率',
    dataIndex: 'rate',
    render: (v: number) => (
      <Progress
        percent={v}
        size="small"
        style={{ width: 160 }}
        strokeColor={v >= 80 ? JL.ok : v >= 60 ? JL.warn : JL.bad}
      />
    ),
    sorter: (a, b) => b.rate - a.rate,
  },
];

export default function EquipmentBoardM486Page() {
  usePageTitle('设备管理看板');
  const { lifecycle, maintenance, utilization, loading, error, demo, load } = useEquipmentBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && lifecycle.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载设备看板…" />
      </div>
    );
  }

  const total = lifecycle.length;
  const inUse = lifecycle.filter((r) => r.status === 'in-use').length;
  const inUseRate = total > 0 ? (inUse / total) * 100 : 0;
  const faultCount = lifecycle.filter((r) => r.status === 'repair').length;
  const avgResponse = 4.2; // 小时

  return (
    <PageContainer
      title="设备管理看板"
      description="设备生命周期 / 维修工单 / 使用率一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /equipment/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.navy}` }}>
            <Statistic title="设备总数" value={total} suffix="台" valueStyle={{ color: JL.navy }} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${inUseRate >= 80 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="在用率"
              value={inUseRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: inUseRate >= 80 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${faultCount > 0 ? JL.bad : JL.ok}` }}>
            <Statistic
              title="故障设备"
              value={faultCount}
              suffix="台"
              valueStyle={{ color: faultCount > 0 ? JL.bad : JL.ok }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="平均响应时间"
              value={avgResponse}
              precision={1}
              suffix="小时"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>设备生命周期</span>}
            style={{ borderTop: `3px solid ${JL.navy}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={LIFECYCLE_COLUMNS} dataSource={lifecycle} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>设备使用率（本月）</span>}
            style={{ borderTop: `3px solid ${JL.ok}` }}
          >
            <Table rowKey="id" columns={UTIL_COLUMNS} dataSource={utilization} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>维修工单</span>}
            style={{ borderTop: `3px solid ${JL.bad}` }}
          >
            <Table rowKey="id" columns={MAINT_COLUMNS} dataSource={maintenance} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
