/**
 * 健澜科技 jlmedaios - 病案首页质量看板（M488）
 * 路由：/emr/homepage-board
 * 顶部 KPI：首页合格率 / 主要诊断正确率 / DRG 入组率 / DIP 消耗指数
 * 首页缺陷 / DRG 分组 / DIP 分值
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9；缺陷 #D9534F、达标 #52C41A
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { DefectItemRow, DipPointRow, DrgGroupRow } from '@/services/api/homepageQualityBoard';
import { useHomepageQualityStore } from '@/store/homepageQualityStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const DEFECT_COLUMNS: ColumnsType<DefectItemRow> = [
  { title: '缺陷项', dataIndex: 'item', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '占比',
    dataIndex: 'ratio',
    render: (v: number) => (
      <Progress
        percent={v}
        size="small"
        style={{ width: 160 }}
        strokeColor={JL.bad}
      />
    ),
    sorter: (a, b) => b.ratio - a.ratio,
  },
  { title: '责任科室', dataIndex: 'dept', render: (v: string) => <Tag color="purple">{v}</Tag> },
];

const DRG_COLUMNS: ColumnsType<DrgGroupRow> = [
  { title: '病组', dataIndex: 'group', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '权重', dataIndex: 'weight', render: (v: number) => v.toFixed(2), sorter: (a, b) => b.weight - a.weight },
  {
    title: '费用指数',
    dataIndex: 'costIndex',
    render: (v: number) => (
      <Tag color={v <= 1 ? 'green' : 'red'}>
        {v <= 1 ? '节约 ' : '超支 '}
        {v.toFixed(2)}
      </Tag>
    ),
  },
];

const DIP_COLUMNS: ColumnsType<DipPointRow> = [
  { title: '病种', dataIndex: 'disease', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '分值', dataIndex: 'points', sorter: (a, b) => b.points - a.points },
  {
    title: '消耗指数',
    dataIndex: 'consumption',
    render: (v: number) => (
      <Tag color={v <= 1 ? 'green' : 'red'}>
        {v <= 1 ? '可控 ' : '超耗 '}
        {v.toFixed(2)}
      </Tag>
    ),
  },
];

export default function HomepageBoardM488Page() {
  usePageTitle('病案首页质量看板');
  const { overview, defects, drg, dip, loading, error, demo, load } = useHomepageQualityStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !overview) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载首页质量看板…" />
      </div>
    );
  }

  const pass = overview?.passRate ?? 0;
  const diag = overview?.primaryDiagCorrect ?? 0;
  const group = overview?.drgGroupRate ?? 0;
  const dipIdx = overview?.dipConsumption ?? 0;

  return (
    <PageContainer
      title="病案首页质量看板"
      description="首页合格率 / 主要诊断正确率 / DRG 入组率 / DIP 消耗指数"
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
          message="当前展示为 DEMO 兜底数据（BFF /emr/homepage-* 与 /drg//dip 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${pass >= 95 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="首页合格率"
              value={pass}
              precision={1}
              suffix="%"
              valueStyle={{ color: pass >= 95 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${diag >= 98 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="主要诊断正确率"
              value={diag}
              precision={1}
              suffix="%"
              valueStyle={{ color: diag >= 98 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${group >= 90 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="DRG 入组率"
              value={group}
              precision={1}
              suffix="%"
              valueStyle={{ color: group >= 90 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${dipIdx <= 1 ? JL.ok : JL.bad}` }}>
            <Statistic
              title="DIP 消耗指数"
              value={dipIdx}
              precision={2}
              valueStyle={{ color: dipIdx <= 1 ? JL.ok : JL.bad, fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>首页缺陷项分布</span>}
            style={{ borderTop: `3px solid ${JL.bad}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={DEFECT_COLUMNS} dataSource={defects} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>DIP 病种分值与消耗指数</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table rowKey="id" columns={DIP_COLUMNS} dataSource={dip} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>DRG 分组权重与费用指数</span>}
            style={{ borderTop: `3px solid ${JL.blue}` }}
          >
            <Table rowKey="id" columns={DRG_COLUMNS} dataSource={drg} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
