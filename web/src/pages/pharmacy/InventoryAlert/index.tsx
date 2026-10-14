/**
 * 健澜科技 jlmedaios - 药品库存预警页
 *
 * 低库存药品列表（缺口最大在前，整行标红）+ 建议采购量列；
 * 下方附全部库存台账。无真实库存时 BFF 返回 demo:true，页面展示"演示数据"徽标。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import {
  Alert, Badge, Card, Col, Empty, Layout, Row, Statistic, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect } from 'react';
import { useDrugInventoryStore } from '@/store/drugInventoryStore';
import type { DrugStockItem, LowStockAlertItem } from '@/services/api/drugInventory';

const { Header, Content } = Layout;
const { Title } = Typography;

/** 库存数量着色：低于阈值红、否则绿 */
function qtyColor(qty: number, threshold: number): string {
  return qty < threshold ? '#cf1322' : '#3f8600';
}

export default function InventoryAlertPage() {
  const { data, loading, error, load } = useDrugInventoryStore();

  useEffect(() => { void load(); }, [load]);

  const threshold = data?.threshold ?? 100;
  const alerts = data?.alerts ?? [];
  const items = data?.items ?? [];

  const alertColumns: ColumnsType<LowStockAlertItem> = [
    { title: '药品编码', dataIndex: 'drugCode', key: 'drugCode', width: 130 },
    { title: '药品名称', dataIndex: 'drugName', key: 'drugName', ellipsis: true },
    { title: '药房', dataIndex: 'warehouse', key: 'warehouse', width: 110 },
    { title: '批号', dataIndex: 'batchNo', key: 'batchNo', width: 110, render: (v: string | null) => v ?? '—' },
    {
      title: '当前库存', dataIndex: 'quantity', key: 'quantity', width: 100,
      render: (v: number, row) => (
        <span style={{ color: qtyColor(v, row.threshold), fontWeight: 600 }}>{v} {row.unit}</span>
      ),
    },
    { title: '安全库存', dataIndex: 'threshold', key: 'threshold', width: 90, render: (v: number) => v },
    {
      title: '缺口', dataIndex: 'shortfall', key: 'shortfall', width: 90,
      render: (v: number) => <Tag color="red">-{v}</Tag>,
    },
    {
      title: '建议采购量', dataIndex: 'suggestedPurchaseQty', key: 'suggestedPurchaseQty', width: 120,
      render: (v: number, row) => <Tag color="volcano" style={{ fontWeight: 600 }}>采购 {v} {row.unit}</Tag>,
    },
    {
      title: '效期', dataIndex: 'expiryDate', key: 'expiryDate', width: 110,
      render: (v: string | null) => v ? v.slice(0, 10) : '—',
    },
  ];

  const stockColumns: ColumnsType<DrugStockItem> = [
    { title: '药品编码', dataIndex: 'drugCode', key: 'drugCode', width: 130 },
    { title: '药品名称', dataIndex: 'drugName', key: 'drugName', ellipsis: true },
    { title: '药房', dataIndex: 'warehouse', key: 'warehouse', width: 110 },
    { title: '批号', dataIndex: 'batchNo', key: 'batchNo', width: 110, render: (v: string | null) => v ?? '—' },
    {
      title: '当前库存', dataIndex: 'quantity', key: 'quantity', width: 110,
      render: (v: number) => (
        <span style={{ color: qtyColor(v, threshold), fontWeight: v < threshold ? 600 : 400 }}>{v}</span>
      ),
    },
    { title: '单位', dataIndex: 'unit', key: 'unit', width: 70 },
    {
      title: '效期', dataIndex: 'expiryDate', key: 'expiryDate', width: 110,
      render: (v: string | null) => v ? v.slice(0, 10) : '—',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>药品库存预警</Title>
        {data?.demo && <Badge count="演示数据" style={{ backgroundColor: '#d48806' }} />}
      </Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        {data?.demo && (
          <Alert type="warning" showIcon style={{ marginBottom: 16 }}
            message="当前无真实库存数据，以下为演示库存（demo）；接入药库后自动切换为真实数据。" />
        )}

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card><Statistic title="库存总行数" value={data?.total ?? '-'} /></Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="低库存预警" value={data?.lowCount ?? 0} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="库存安全阈值" value={threshold} suffix="单位" /></Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="建议采购总量"
                value={alerts.reduce((s, a) => s + a.suggestedPurchaseQty, 0)}
                valueStyle={{ color: '#d46b08' }}
              />
            </Card>
          </Col>
        </Row>

        <Card title="低库存预警（需采购补货）" style={{ marginBottom: 16 }}>
          <Table
            rowKey="id" size="small" loading={loading}
            columns={alertColumns} dataSource={alerts} pagination={false}
            rowClassName={(row) => (row.quantity < row.threshold ? 'jl-row-low-stock' : '')}
            locale={{ emptyText: <Empty description="库存充足，暂无低库存预警" /> }}
          />
        </Card>

        <Card title="全部库存台账">
          <Table
            rowKey="id" size="small" loading={loading}
            columns={stockColumns} dataSource={items}
            rowClassName={(row) => (row.quantity < threshold ? 'jl-row-low-stock' : '')}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            locale={{ emptyText: <Empty description="暂无库存数据" /> }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
