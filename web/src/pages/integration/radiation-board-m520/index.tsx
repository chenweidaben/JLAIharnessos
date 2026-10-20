/**
 * 健澜科技 jlmedaios - 放射防护监控看板（M520）
 * 路由：/integration/radiation-board
 * 顶部 KPI：今日检查例数 / 平均剂量 mSv / 设备异常数 / 个人剂量超标人数
 * 患者剂量 / 设备巡检 / 个人剂量
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { DoseRow, EquipmentRow, PersonnelRow } from '@/services/api/radiationBoard';
import { useRadiationBoardStore } from '@/store/radiationBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const EXAM_TYPE: Record<string, { color: string; label: string }> = {
  CT: { color: 'blue', label: 'CT' },
  DR: { color: 'green', label: 'DR' },
  MRI: { color: 'purple', label: 'MRI' },
  CARM: { color: 'orange', label: 'CARM' },
};

const STATUS: Record<string, { color: string; label: string }> = {
  normal: { color: 'green', label: '正常' },
  attention: { color: 'orange', label: '关注' },
  abnormal: { color: 'red', label: '异常' },
};

const ROLE: Record<string, { color: string; label: string }> = {
  radiologist: { color: 'blue', label: '放射医师' },
  nurse: { color: 'green', label: '护士' },
  technician: { color: 'orange', label: '技师' },
};

function doseTag(v: number) {
  if (v === 0) return <Tag color="default">0.00 mSv</Tag>;
  if (v > 10) return <Tag color="red">{v.toFixed(2)} mSv</Tag>;
  if (v >= 5) return <Tag color="orange">{v.toFixed(2)} mSv</Tag>;
  return <Tag color="green">{v.toFixed(2)} mSv</Tag>;
}

const DOSE_COLUMNS: ColumnsType<DoseRow> = [
  { title: '患者', dataIndex: 'patient', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '检查类型',
    dataIndex: 'examType',
    render: (v: string) => {
      const m = EXAM_TYPE[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '剂量', dataIndex: 'doseMSv', render: (v: number) => doseTag(v), sorter: (a, b) => b.doseMSv - a.doseMSv },
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="cyan">{v}</Tag> },
  { title: '检查日期', dataIndex: 'examDate' },
];

const EQUIP_COLUMNS: ColumnsType<EquipmentRow> = [
  { title: '设备名', dataIndex: 'deviceName', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '类型',
    dataIndex: 'deviceType',
    render: (v: string) => {
      const m = EXAM_TYPE[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '上次巡检', dataIndex: 'lastInspectionAt' },
  {
    title: '状态',
    dataIndex: 'status',
    render: (v: string) => {
      const m = STATUS[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '下次巡检到期', dataIndex: 'nextInspectionDue' },
];

const PERSONNEL_COLUMNS: ColumnsType<PersonnelRow> = [
  { title: '人员', dataIndex: 'staffName', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '角色',
    dataIndex: 'role',
    render: (v: string) => {
      const m = ROLE[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '剂量计 ID', dataIndex: 'badgeId' },
  { title: '月剂量', dataIndex: 'monthlyDoseMSv', render: (v: number) => `${v.toFixed(2)} mSv`, sorter: (a, b) => b.monthlyDoseMSv - a.monthlyDoseMSv },
  { title: '限值', dataIndex: 'limitMSv', render: (v: number) => `${v.toFixed(1)} mSv` },
  {
    title: '是否超标',
    dataIndex: 'overLimit',
    render: (v: boolean) => (v ? <Tag color="red">超标</Tag> : <Tag color="green">正常</Tag>),
  },
];

export default function RadiationBoardM520Page() {
  usePageTitle('放射防护监控看板');
  const { doses, equipment, personnel, loading, error, demo, load } = useRadiationBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpi = useMemo(() => {
    const avgDose = doses.reduce((a, d) => a + d.doseMSv, 0) / (doses.length || 1);
    const eqAbnormal = equipment.filter((e) => e.status === 'abnormal').length;
    const overLimit = personnel.filter((p) => p.overLimit).length;
    return { avgDose, eqAbnormal, overLimit };
  }, [doses, equipment, personnel]);

  if (loading && doses.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载放射防护看板…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="放射防护监控看板（医院管理 P0）"
      description="患者剂量 / 设备巡检 / 个人剂量 一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /radiation/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="今日检查"
              value={doses.length}
              suffix="例"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.warn}` }}>
            <Statistic
              title="平均剂量"
              value={kpi.avgDose}
              precision={2}
              suffix="mSv"
              valueStyle={{ color: JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.bad}` }}>
            <Statistic
              title="设备异常"
              value={kpi.eqAbnormal}
              suffix="台"
              valueStyle={{ color: JL.bad }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.bad}` }}>
            <Statistic
              title="个人剂量超标"
              value={kpi.overLimit}
              suffix="人"
              valueStyle={{ color: JL.bad }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={<span style={{ color: JL.navy, fontWeight: 600 }}>患者剂量</span>}
        style={{ borderTop: `3px solid ${JL.warn}`, marginBottom: 16 }}
      >
        <Table rowKey="id" columns={DOSE_COLUMNS} dataSource={doses} pagination={false} size="middle" />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>设备巡检</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={EQUIP_COLUMNS} dataSource={equipment} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>个人剂量</span>}
            style={{ borderTop: `3px solid ${JL.bad}` }}
          >
            <Table rowKey="id" columns={PERSONNEL_COLUMNS} dataSource={personnel} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
