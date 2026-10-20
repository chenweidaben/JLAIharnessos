/**
 * 健澜科技 jlmedaios - 医技科室运营看板（M489）
 * 路由：/medtech/board
 * 顶部 KPI：今日检验标本数 / 今日影像检查数 / 今日病理标本数 / 报告及时率
 * 检验 / 影像 / 病理
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { LabRow, PathologyRow, RadiologyRow } from '@/services/api/medtechBoard';
import { useMedtechBoardStore } from '@/store/medtechBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const LAB_COLUMNS: ColumnsType<LabRow> = [
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '标本数', dataIndex: 'samples', sorter: (a, b) => b.samples - a.samples },
  { title: '异常数', dataIndex: 'abnormal' },
  {
    title: '及时率',
    dataIndex: 'timelyRate',
    render: (v: number) => (
      <Tag color={v >= 95 ? 'green' : v >= 90 ? 'orange' : 'red'}>{v.toFixed(1)}%</Tag>
    ),
    sorter: (a, b) => b.timelyRate - a.timelyRate,
  },
];

const RAD_COLUMNS: ColumnsType<RadiologyRow> = [
  { title: '设备', dataIndex: 'device', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '检查数', dataIndex: 'exams', sorter: (a, b) => b.exams - a.exams },
  {
    title: '阳性率',
    dataIndex: 'positiveRate',
    render: (v: number) => `${v.toFixed(1)}%`,
    sorter: (a, b) => b.positiveRate - a.positiveRate,
  },
  {
    title: '平均等待(分钟)',
    dataIndex: 'waitMinutes',
    render: (v: number) => (
      <Text style={{ color: v <= 20 ? JL.ok : v <= 30 ? JL.warn : JL.bad }}>{v}</Text>
    ),
    sorter: (a, b) => a.waitMinutes - b.waitMinutes,
  },
];

const PATH_COLUMNS: ColumnsType<PathologyRow> = [
  { title: '标本类型', dataIndex: 'type', render: (v: string) => <Tag color="purple">{v}</Tag> },
  { title: '例数', dataIndex: 'count', sorter: (a, b) => b.count - a.count },
  {
    title: '报告周期(天)',
    dataIndex: 'reportDays',
    render: (v: number) => (
      <Text style={{ color: v <= 3 ? JL.ok : v <= 5 ? JL.warn : JL.bad }}>{v} 天</Text>
    ),
  },
];

export default function MedtechBoardM489Page() {
  usePageTitle('医技科室运营看板');
  const { lab, radiology, pathology, loading, error, demo, load } = useMedtechBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && lab.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载医技看板…" />
      </div>
    );
  }

  const totalLab = lab.reduce((s, r) => s + r.samples, 0);
  const totalRad = radiology.reduce((s, r) => s + r.exams, 0);
  const totalPath = pathology.reduce((s, r) => s + r.count, 0);
  const avgTimely = lab.length > 0 ? lab.reduce((s, r) => s + r.timelyRate, 0) / lab.length : 0;

  return (
    <PageContainer
      title="医技科室运营看板"
      description="检验 / 影像 / 病理工作量与质量一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /lab|radiology|pathology/workload 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.navy}` }}>
            <Statistic title="今日检验标本" value={totalLab} suffix="件" valueStyle={{ color: JL.navy }} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic title="今日影像检查" value={totalRad} suffix="例" valueStyle={{ color: JL.blue }} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic title="今日病理标本" value={totalPath} suffix="例" valueStyle={{ color: JL.accent }} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${avgTimely >= 95 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="检验平均及时率"
              value={avgTimely}
              precision={1}
              suffix="%"
              valueStyle={{ color: avgTimely >= 95 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>检验科工作量</span>}
            style={{ borderTop: `3px solid ${JL.navy}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={LAB_COLUMNS} dataSource={lab} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>病理标本报告周期</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table rowKey="id" columns={PATH_COLUMNS} dataSource={pathology} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>影像设备工作量</span>}
            style={{ borderTop: `3px solid ${JL.blue}` }}
          >
            <Table rowKey="id" columns={RAD_COLUMNS} dataSource={radiology} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
