/**
 * 健澜科技 jlmedaios - 药学管理看板（M484）
 * 路由：/pharmacy/board
 * 顶部 KPI：库存金额 / 近效期药品数 / 处方不合理率 / 麻精台账数
 * 库存 Table / 处方点评 Table / 麻精药品 Table
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9；近效期/不合理 #D9534F、达标 #52C41A
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { InventoryRow, PrescriptionReviewRow, SpecialDrugRow } from '@/services/api/pharmacyBoard';
import { usePharmacyBoardStore } from '@/store/pharmacyBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

function expiryTag(expiry: string) {
  const today = new Date('2026-10-20');
  const exp = new Date(expiry);
  const days = Math.floor((exp.getTime() - today.getTime()) / 86400000);
  if (days < 0) return <Tag color="red">已过期</Tag>;
  if (days <= 90) return <Tag color="orange">90 天内到期</Tag>;
  return <Tag color="green">正常</Tag>;
}

const INVENTORY_COLUMNS: ColumnsType<InventoryRow> = [
  { title: '药品', dataIndex: 'name', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '规格', dataIndex: 'spec' },
  { title: '库存', dataIndex: 'stock', render: (v: number, r) => `${v} ${r.unit}`, sorter: (a, b) => b.stock - a.stock },
  { title: '效期', dataIndex: 'expiry' },
  { title: '效期预警', dataIndex: 'expiry', render: (v: string) => expiryTag(v) },
  { title: '库存金额(元)', dataIndex: 'amount', render: (v: number) => `¥${v.toLocaleString()}`, sorter: (a, b) => b.amount - a.amount },
];

const REVIEW_COLUMNS: ColumnsType<PrescriptionReviewRow> = [
  { title: '科室', dataIndex: 'dept', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '抽查处方', dataIndex: 'reviewed', sorter: (a, b) => b.reviewed - a.reviewed },
  { title: '不合理数', dataIndex: 'irrational' },
  {
    title: '不合理率',
    dataIndex: 'irrationalRate',
    render: (v: number) => (
      <Progress
        percent={v}
        size="small"
        style={{ width: 160 }}
        strokeColor={v < 3 ? JL.ok : v < 6 ? JL.warn : JL.bad}
      />
    ),
    sorter: (a, b) => b.irrationalRate - a.irrationalRate,
  },
];

const SPECIAL_COLUMNS: ColumnsType<SpecialDrugRow> = [
  { title: '品名', dataIndex: 'name', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '批号', dataIndex: 'batch', render: (v: string) => <Tag color="purple">{v}</Tag> },
  { title: '领用量', dataIndex: 'used', render: (v: number, r) => `${v} ${r.unit}` },
  {
    title: '双人双锁',
    dataIndex: 'dualLock',
    render: (v: boolean) => (v ? <Tag color="green">已执行</Tag> : <Tag color="red">未执行</Tag>),
  },
];

export default function PharmacyBoardM484Page() {
  usePageTitle('药学管理看板');
  const { inventory, review, special, loading, error, demo, load } = usePharmacyBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && inventory.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载药学看板…" />
      </div>
    );
  }

  const totalAmount = inventory.reduce((s, r) => s + r.amount, 0);
  const nearExpiry = inventory.filter((r) => {
    const exp = new Date(r.expiry);
    const days = Math.floor((exp.getTime() - new Date('2026-10-20').getTime()) / 86400000);
    return days <= 90;
  }).length;
  const totalReviewed = review.reduce((s, r) => s + r.reviewed, 0);
  const totalIrrational = review.reduce((s, r) => s + r.irrational, 0);
  const irrationalRate = totalReviewed > 0 ? (totalIrrational / totalReviewed) * 100 : 0;

  return (
    <PageContainer
      title="药学管理看板"
      description="库存 / 近效期预警 / 处方点评 / 麻精药品台账"
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
          message="当前展示为 DEMO 兜底数据（BFF /pharmacy/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="库存金额"
              value={totalAmount}
              prefix="¥"
              valueStyle={{ color: JL.blue, fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${nearExpiry > 0 ? JL.bad : JL.ok}` }}>
            <Statistic
              title="近 90 天到期药品"
              value={nearExpiry}
              suffix={`/ ${inventory.length}`}
              valueStyle={{ color: nearExpiry > 0 ? JL.bad : JL.ok }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${irrationalRate < 3 ? JL.ok : irrationalRate < 6 ? JL.warn : JL.bad}` }}>
            <Statistic
              title="处方不合理率"
              value={irrationalRate}
              precision={2}
              suffix="%"
              valueStyle={{
                color: irrationalRate < 3 ? JL.ok : irrationalRate < 6 ? JL.warn : JL.bad,
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.navy}` }}>
            <Statistic
              title="麻精药品台账"
              value={special.length}
              suffix="种"
              valueStyle={{ color: JL.navy, fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>药品库存与效期</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={INVENTORY_COLUMNS} dataSource={inventory} pagination={false} size="middle" />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>麻精药品双人双锁台账</span>}
            style={{ borderTop: `3px solid ${JL.bad}` }}
          >
            <Table rowKey="id" columns={SPECIAL_COLUMNS} dataSource={special} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>处方点评（按科室不合理率）</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table rowKey="id" columns={REVIEW_COLUMNS} dataSource={review} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
