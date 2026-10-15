/**
 * 健澜科技 jlmedaios - 药品全生命周期页（M153-B）
 *
 * 采购入库 → 库存 → 处方 → 不良反应 全链路批次追溯：
 *  - 近效期自动预警（≤90 天，按 ≤30/≤60/≤90 分级标色）；
 *  - 问题批次一键召回——仅停指定批号，同药品其他批次正常销售（页面明示误伤范围）。
 *
 * 临床决策支持：AI/系统仅做预警与召回辅助，召回动作由药师/质控本人确认。
 * 深海蓝 VI：主色 #0A4D8C。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import {
  Alert, Badge, Button, Card, Col, Empty, Input, Layout, Modal, Row, Space, Statistic, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ExclamationCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { get, put } from '@/services/request';

const { Header, Content } = Layout;
const { Title } = Typography;

/** 深海蓝 VI */
const DEEP_SEA = '#0A4D8C';

// ---------------------------------------------------------------------------
// 类型（与 BFF 视图对齐）
// ---------------------------------------------------------------------------
interface Batch {
  batchNo: string;
  drugId: string;
  drugCode: string;
  drugName: string;
  productionDate: string;
  expiryDate: string;
  supplier: string;
  quantity: number;
  unit: string;
  status: 'active' | 'recalled' | 'expired' | 'discarded';
  recallReason: string | null;
  dispensedCount: number;
  adverse: Array<{ reaction: string; severity: string; count: number }>;
}
interface ExpiringBatch extends Batch {
  daysToExpiry: number;
  riskLevel: 'critical' | 'warning' | 'notice';
}
interface LifecycleView {
  totalBatches: number;
  activeBatches: number;
  recalledBatches: number;
  expiringBatches: ExpiringBatch[];
  batches: Batch[];
  demo: boolean;
  scannedAt: string;
}
interface RecallResult {
  batchNo: string;
  drugName: string;
  result: 'recalled' | 'not_found' | 'already_recalled';
  affectedQuantity: number;
  otherActiveBatches: number;
  message: string;
}

/** 紧急度 → 标签色 */
function riskTag(risk: ExpiringBatch['riskLevel']): string {
  return risk === 'critical' ? 'red' : risk === 'warning' ? 'orange' : 'gold';
}
function riskText(risk: ExpiringBatch['riskLevel']): string {
  return risk === 'critical' ? '≤30天 紧急' : risk === 'warning' ? '≤60天 警告' : '≤90天 注意';
}

export default function DrugLifecyclePage() {
  const [data, setData] = useState<LifecycleView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recallTarget, setRecallTarget] = useState<Batch | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const v = await get<LifecycleView>('/pharmacy/lifecycle');
      setData(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : '生命周期数据加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const confirmRecall = async () => {
    if (!recallTarget) return;
    setSubmitting(true);
    try {
      const r = await put<RecallResult>(`/pharmacy/recall/${recallTarget.batchNo}`, { reason });
      Modal.success({
        title: '召回完成（批次级）',
        content: `${r.message}。同药品其他 ${r.otherActiveBatches} 个批次不受影响、正常销售。`,
      });
      setRecallTarget(null);
      setReason('');
      void load();
    } catch (e) {
      Modal.error({ title: '召回失败', content: e instanceof Error ? e.message : '请重试' });
    } finally {
      setSubmitting(false);
    }
  };

  const expiringColumns: ColumnsType<ExpiringBatch> = [
    { title: '批号', dataIndex: 'batchNo', key: 'batchNo', width: 120 },
    { title: '药品名称', dataIndex: 'drugName', key: 'drugName', ellipsis: true },
    { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 160, ellipsis: true },
    { title: '库存', dataIndex: 'quantity', key: 'quantity', width: 90, render: (v: number, r) => `${v}${r.unit}` },
    { title: '失效日期', dataIndex: 'expiryDate', key: 'expiryDate', width: 110, render: (v: string) => v.slice(0, 10) },
    {
      title: '距效期', dataIndex: 'daysToExpiry', key: 'daysToExpiry', width: 100,
      render: (v: number) => <span style={{ color: '#cf1322', fontWeight: 600 }}>{v} 天</span>,
    },
    {
      title: '紧急度', dataIndex: 'riskLevel', key: 'riskLevel', width: 130,
      render: (v: ExpiringBatch['riskLevel']) => <Tag color={riskTag(v)}>{riskText(v)}</Tag>,
    },
  ];

  const batchColumns: ColumnsType<Batch> = [
    { title: '批号', dataIndex: 'batchNo', key: 'batchNo', width: 120 },
    { title: '药品名称', dataIndex: 'drugName', key: 'drugName', ellipsis: true },
    { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 160, ellipsis: true },
    { title: '库存', dataIndex: 'quantity', key: 'quantity', width: 90, render: (v: number, r) => `${v}${r.unit}` },
    { title: '已发药', dataIndex: 'dispensedCount', key: 'dispensedCount', width: 80 },
    { title: '生产日期', dataIndex: 'productionDate', key: 'productionDate', width: 110, render: (v: string) => v.slice(0, 10) },
    { title: '失效日期', dataIndex: 'expiryDate', key: 'expiryDate', width: 110, render: (v: string) => v.slice(0, 10) },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (v: Batch['status'], r) => v === 'recalled'
        ? <Tag color="red">已召回</Tag>
        : v === 'expired'
          ? <Tag color="default">已过期</Tag>
          : <Tag color="green">在库</Tag>,
    },
    {
      title: '不良反应', dataIndex: 'adverse', key: 'adverse', width: 140,
      render: (list: Batch['adverse']) => list.length === 0
        ? <Tag>无上报</Tag>
        : <Tag color={list.some((a) => a.severity === 'severe') ? 'red' : 'orange'}>
          {list.reduce((s, a) => s + a.count, 0)} 例
        </Tag>,
    },
    {
      title: '操作', key: 'op', width: 110,
      render: (_: unknown, row) => row.status === 'recalled'
        ? <Badge status="success" text="已停售" />
        : (
          <Button
            danger size="small" icon={<ExclamationCircleOutlined />}
            onClick={() => { setRecallTarget(row); setReason(''); }}
          >
            召回
          </Button>
        ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: DEEP_SEA, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>药品全生命周期管理</Title>
        <Tag color="rgba(255,255,255,0.25)" style={{ color: '#fff' }}>临床决策支持</Tag>
        {data?.demo && <Badge count="演示数据" style={{ backgroundColor: '#d48806' }} />}
      </Header>
      <Content style={{ padding: 24, background: '#F5F7FA' }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        {data?.demo && (
          <Alert type="info" showIcon style={{ marginBottom: 16 }}
            message="批次级追溯：召回仅锁定指定批号，同药品其他批号正常销售；以下为演示数据。" />
        )}

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card><Statistic title="追溯批次数" value={data?.totalBatches ?? '-'} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="在库批次" value={data?.activeBatches ?? '-'} valueStyle={{ color: '#3f8600' }} /></Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="近效期预警(≤90天)" value={data?.expiringBatches.length ?? 0}
                prefix={<WarningOutlined />} valueStyle={{ color: '#d46b08' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="已召回批次" value={data?.recalledBatches ?? 0} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
        </Row>

        <Card title="近效期自动预警（≤90 天，最紧急在前）" style={{ marginBottom: 16 }}>
          <Table
            rowKey="batchNo" size="small" loading={loading}
            columns={expiringColumns} dataSource={data?.expiringBatches ?? []} pagination={false}
            locale={{ emptyText: <Empty description="暂无近效期批次" /> }}
          />
        </Card>

        <Card title="批次全链路台账（采购→库存→处方→不良反应）">
          <Table
            rowKey="batchNo" size="small" loading={loading}
            columns={batchColumns} dataSource={data?.batches ?? []}
            pagination={{ pageSize: 15, showSizeChanger: false }}
            locale={{ emptyText: <Empty description="暂无批次数据" /> }}
          />
        </Card>
      </Content>

      <Modal
        open={!!recallTarget}
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#cf1322' }} />
            批次召回确认
          </Space>
        }
        onCancel={() => setRecallTarget(null)}
        onOk={confirmRecall}
        confirmLoading={submitting}
        okText="确认召回（仅本批次）"
        okButtonProps={{ danger: true }}
      >
        <Alert type="warning" showIcon style={{ marginBottom: 12 }}
          message="召回精确到批号，不会停售同药品的其他批次。" />
        <p>
          药品：<b>{recallTarget?.drugName}</b>
          {'　'}批号：<b style={{ color: '#cf1322' }}>{recallTarget?.batchNo}</b>
          {'　'}数量：{recallTarget?.quantity}
          {recallTarget?.unit}
        </p>
        <Input.TextArea
          rows={3} placeholder="请填写召回原因（药监通报 / 质量问题 / 临床反馈…）"
          value={reason} onChange={(e) => setReason(e.target.value)}
        />
      </Modal>
    </Layout>
  );
}
