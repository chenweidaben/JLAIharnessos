/**
 * 健澜科技 jlmedaios - 消毒供应中心 CSSD 看板（M487）
 * 路由：/cssd/board
 * 顶部 KPI：今日消毒包数 / 包装合格率 / 生物监测合格率 / 缺包预警数
 * 工作量 / 质量监测 / 无菌包库存
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9；预警 #D9534F、达标 #52C41A
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { QualityRow, StockRow, WorkloadRow } from '@/services/api/cssdBoard';
import { useCssdBoardStore } from '@/store/cssdBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const WORKLOAD_COLUMNS: ColumnsType<WorkloadRow> = [
  { title: '科室/包型', dataIndex: 'dept', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '清洗(件)', dataIndex: 'cleaned', sorter: (a, b) => b.cleaned - a.cleaned },
  { title: '包装(件)', dataIndex: 'packed' },
  { title: '灭菌(件)', dataIndex: 'sterilized' },
];

const QUALITY_COLUMNS: ColumnsType<QualityRow> = [
  { title: '监测项目', dataIndex: 'item', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '合格率',
    dataIndex: 'passRate',
    render: (v: number) => (
      <Progress
        percent={v}
        size="small"
        style={{ width: 200 }}
        strokeColor={v >= 99 ? JL.ok : v >= 95 ? JL.warn : JL.bad}
      />
    ),
    sorter: (a, b) => b.passRate - a.passRate,
  },
];

function stockTag(stock: number, safetyStock: number) {
  if (stock < safetyStock) return <Tag color="red">低于安全库存</Tag>;
  if (stock < safetyStock * 1.5) return <Tag color="orange">接近安全库存</Tag>;
  return <Tag color="green">充足</Tag>;
}

const STOCK_COLUMNS: ColumnsType<StockRow> = [
  { title: '无菌包', dataIndex: 'name', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '在库数', dataIndex: 'stock', sorter: (a, b) => b.stock - a.stock },
  { title: '安全库存', dataIndex: 'safetyStock' },
  { title: '效期', dataIndex: 'expiry' },
  { title: '库存状态', dataIndex: 'stock', render: (v: number, r) => stockTag(v, r.safetyStock) },
];

export default function CssdBoardM487Page() {
  usePageTitle('CSSD 消毒供应中心看板');
  const { workload, quality, stock, loading, error, demo, load } = useCssdBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && workload.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载 CSSD 看板…" />
      </div>
    );
  }

  const totalSterilized = workload.reduce((s, r) => s + r.sterilized, 0);
  const packagingQ = quality.find((q) => q.item === '包装合格率')?.passRate ?? 0;
  const bioQ = quality.find((q) => q.item === '生物监测合格率')?.passRate ?? 0;
  const lowStock = stock.filter((r) => r.stock < r.safetyStock).length;

  return (
    <PageContainer
      title="CSSD 消毒供应中心看板"
      description="工作量 / 质量监测 / 无菌包库存一屏总览"
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
          message="当前展示为 DEMO 兜底数据（BFF /cssd/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.navy}` }}>
            <Statistic title="今日消毒包数" value={totalSterilized} suffix="件" valueStyle={{ color: JL.navy }} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${packagingQ >= 99 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="包装合格率"
              value={packagingQ}
              precision={1}
              suffix="%"
              valueStyle={{ color: packagingQ >= 99 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${bioQ >= 99 ? JL.ok : JL.warn}` }}>
            <Statistic
              title="生物监测合格率"
              value={bioQ}
              precision={1}
              suffix="%"
              valueStyle={{ color: bioQ >= 99 ? JL.ok : JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${lowStock > 0 ? JL.bad : JL.ok}` }}>
            <Statistic
              title="缺包预警"
              value={lowStock}
              suffix={`/ ${stock.length}`}
              valueStyle={{ color: lowStock > 0 ? JL.bad : JL.ok }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>今日工作量</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={WORKLOAD_COLUMNS} dataSource={workload} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>无菌包库存与效期</span>}
            style={{ borderTop: `3px solid ${lowStock > 0 ? JL.bad : JL.ok}` }}
          >
            <Table rowKey="id" columns={STOCK_COLUMNS} dataSource={stock} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>质量监测合格率</span>}
            style={{ borderTop: `3px solid ${JL.ok}` }}
          >
            <Table rowKey="id" columns={QUALITY_COLUMNS} dataSource={quality} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
