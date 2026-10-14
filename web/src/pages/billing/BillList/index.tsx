/**
 * 健澜科技 jlmedaios - 住院费用清单页（按类别汇总 + 明细列表）
 *
 * 顶部：各费用类别合计卡片 + 总费用；下方：费用明细表格。
 * 数据来源 GET /api/v1/bill?visitId=；无真实费用时后端返回 demo=true 演示行。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import {
  Alert,
  Card,
  Col,
  Layout,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
  Watermark,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { usePermission } from '@/router/guards';
import { useBillStore } from '@/store/billStore';
import { categoryLabel, formatMoney, statusLabel } from '@/utils/bill';
import type { BillDetailRow } from '@/types/bill';

const { Header, Content } = Layout;
const { Title } = Typography;

const watermarkText = ['健澜科技', '住院费用清单', 'jlmedaios'];

/** 状态标签配色。 */
const STATUS_COLOR: Record<string, string> = {
  active: 'blue',
  settled: 'green',
  refunded: 'orange',
  void: 'default',
};

function fmtTime(iso: string): string {
  if (!iso) return '';
  return iso.replace('T', ' ').slice(0, 16);
}

export default function BillListPage() {
  const { dbUp, view, loading, error, checkHealth, load } = useBillStore();
  usePermission();

  // 就诊 visitId 由 URL 传入，例如 /billing/bill-list?visitId=xxx
  const visitId = new URLSearchParams(window.location.search).get('visitId') ?? '';

  useEffect(() => {
    void checkHealth().then(() => load(visitId));
  }, [checkHealth, load, visitId]);

  const columns: ColumnsType<BillDetailRow> = [
    { title: '费用项目', dataIndex: 'itemName', key: 'itemName' },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 90,
      render: (cat: string) => <Tag>{categoryLabel(cat)}</Tag>,
    },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80, align: 'right' },
    {
      title: '单价(元)',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 110,
      align: 'right',
      render: (v: number) => formatMoney(v),
    },
    {
      title: '金额(元)',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (v: number) => <strong>{formatMoney(v)}</strong>,
    },
    { title: '科室', dataIndex: 'department', key: 'department', width: 110 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (s: string) => <Tag color={STATUS_COLOR[s] ?? 'default'}>{statusLabel(s)}</Tag>,
    },
    {
      title: '发生时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (v: string) => fmtTime(v),
    },
  ];

  if (dbUp === false) {
    return (
      <Watermark content={watermarkText}>
        <Layout style={{ minHeight: '100vh' }}>
          <Header><Title level={4} style={{ color: '#fff' }}>住院费用清单</Title></Header>
          <Content style={{ padding: 24, opacity: 0.4 }}>
            <Alert type="error" showIcon message="数据库连接异常" />
          </Content>
        </Layout>
      </Watermark>
    );
  }
  if (dbUp === null) return null;

  return (
    <Watermark content={watermarkText}>
      <Layout style={{ minHeight: '100vh' }}>
        <Header>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>住院费用清单</Title>
        </Header>
        <Content style={{ padding: 24 }}>
          {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
          {view?.demo && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="当前就诊尚未产生真实计费，以下为演示数据。"
            />
          )}

          {/* 顶部：类别汇总卡 + 总费用 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="费用合计(元)"
                  value={formatMoney(view?.total ?? 0)}
                  precision={2}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic title="明细条目" value={view?.itemCount ?? 0} suffix="项" />
              </Card>
            </Col>
            {(view?.categories ?? []).map((c) => (
              <Col xs={12} sm={8} md={6} key={c.category}>
                <Card>
                  <Statistic
                    title={`${categoryLabel(c.category)}（${c.count} 项）`}
                    value={formatMoney(c.total)}
                    precision={2}
                  />
                </Card>
              </Col>
            ))}
          </Row>

          {/* 下方：明细列表 */}
          <Card title="费用明细" style={{ marginTop: 16 }}>
            <Table<BillDetailRow>
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={view?.items ?? []}
              pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
              size="middle"
            />
          </Card>
        </Content>
      </Layout>
    </Watermark>
  );
}
