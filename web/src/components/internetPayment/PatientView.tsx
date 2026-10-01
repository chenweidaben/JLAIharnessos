/**
 * 健澜科技 jlmedaios - 互联网在线支付 · 患者端视图（M3-M）
 *
 * 可支付处方（approved）→ 发起支付（mock 下单即完成）→ 支付单/电子票据列表；
 * 在途支付单可取消；断库时由页面级门禁统一阻断，本组件不渲染假数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Descriptions,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useInternetPaymentStore } from '../../store/internetPaymentStore';
import type { OnlinePaymentView, EInvoiceView } from '../../types/internetPayment';
import type { EPrescriptionView } from '../../types/internetPrescription';

const fmt = (n: number | string | null | undefined) => {
  if (n == null) return '-';
  const v = Number(n);
  return Number.isFinite(v) ? `¥${v.toFixed(2)}` : '-';
};

const statusTag = (s: string) => {
  const map: Record<string, { c: string; t: string }> = {
    pending: { c: 'gold', t: '待支付' },
    processing: { c: 'processing', t: '支付中' },
    paid: { c: 'green', t: '已支付' },
    failed: { c: 'red', t: '支付失败' },
    cancelled: { c: 'default', t: '已取消' },
    issued: { c: 'green', t: '已开票' },
    reversed: { c: 'default', t: '已冲红' },
  };
  const m = map[s] ?? { c: 'default', t: s };
  return <Tag color={m.c}>{m.t}</Tag>;
};

export function PatientView({ patientId }: { patientId: string }) {
  const { message } = App.useApp();
  const {
    healthOk,
    loading,
    submitting,
    myPayments,
    myInvoices,
    payableRx,
    loadMy,
    createPayment,
    cancelPayment,
  } = useInternetPaymentStore();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (healthOk && patientId) loadMy(patientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [healthOk, patientId]);

  const onPay = async (rx: EPrescriptionView) => {
    setPayingId(rx.id);
    try {
      const r = await createPayment(patientId, rx.id);
      if (r.invoice) {
        message.success(`支付成功，电子票据 ${r.invoice.invoiceNo} 已开具`);
      } else {
        message.success('支付单已创建，等待渠道回调');
      }
    } catch (e) {
      message.error((e as Error).message ?? '支付失败');
    } finally {
      setPayingId(null);
    }
  };

  const onCancel = async (pay: OnlinePaymentView) => {
    setCancellingId(pay.id);
    try {
      await cancelPayment(patientId, pay.id);
      message.success('支付单已取消');
    } catch (e) {
      message.error((e as Error).message ?? '取消失败');
    } finally {
      setCancellingId(null);
    }
  };

  const rxCols: ColumnsType<EPrescriptionView> = [
    { title: '处方号', dataIndex: 'rxNo', key: 'rxNo' },
    {
      title: '药品',
      key: 'items',
      render: (_, r) =>
        (r.items ?? []).map((i) => i.drugName).join('、') || '-',
    },
    { title: '金额', key: 'fee', render: (_, r) => fmt(r.totalFee) },
    {
      title: '操作',
      key: 'op',
      render: (_, r) => (
        <Button
          type="primary"
          size="small"
          loading={payingId === r.id}
          disabled={submitting || !healthOk}
          onClick={() => onPay(r)}
        >
          去支付
        </Button>
      ),
    },
  ];

  const payCols: ColumnsType<OnlinePaymentView> = [
    { title: '支付单号', dataIndex: 'payNo', key: 'payNo' },
    { title: '金额', key: 'amount', render: (_, p) => fmt(p.amount) },
    {
      title: '医保/自付',
      key: 'split',
      render: (_, p) => (
        <Space size={4}>
          <Typography.Text type="secondary">统筹 {fmt(p.medicarePaid)}</Typography.Text>
          <Typography.Text type="secondary">自付 {fmt(p.selfPaid)}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => statusTag(s),
    },
    {
      title: '渠道流水号',
      dataIndex: 'channelTxnNo',
      key: 'channelTxnNo',
      render: (v: string | null) => v ?? '-',
    },
    {
      title: '操作',
      key: 'op',
      render: (_, p) =>
        p.status === 'pending' || p.status === 'processing' ? (
          <Button
            size="small"
            danger
            loading={cancellingId === p.id}
            disabled={submitting}
            onClick={() => onCancel(p)}
          >
            取消支付单
          </Button>
        ) : null,
    },
  ];

  const invCols: ColumnsType<EInvoiceView> = [
    { title: '票据号', dataIndex: 'invoiceNo', key: 'invoiceNo' },
    { title: '金额', key: 'amount', render: (_, v) => fmt(v.amount) },
    {
      title: '医保/自付',
      key: 'split',
      render: (_, v) => (
        <Space size={4}>
          <Typography.Text type="secondary">统筹 {fmt(v.medicarePaid)}</Typography.Text>
          <Typography.Text type="secondary">自付 {fmt(v.selfPaid)}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => statusTag(s),
    },
    {
      title: '冲红',
      dataIndex: 'reversalOf',
      key: 'reversalOf',
      render: (v: string | null) => (v ? <Tag color="volcano">冲红自 {v.slice(0, 8)}</Tag> : '-'),
    },
    { title: '开票时间', dataIndex: 'issuedAt', key: 'issuedAt', render: (v: string) => v?.slice(0, 19) ?? '-' },
  ];

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="在线支付采用可插拔渠道：当前演示渠道为本地模拟支付，正式环境接入微信支付/支付宝后自动切换为真实资金流水。医保费用为本地按统筹/自付比例分割（不接外部医保平台）。"
      />

      <Typography.Title level={5} style={{ marginBottom: 0 }}>
        待支付处方
      </Typography.Title>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={payableRx}
        columns={rxCols}
        pagination={false}
        locale={{ emptyText: '暂无待支付处方' }}
      />

      <Typography.Title level={5} style={{ marginBottom: 0 }}>
        我的支付单
      </Typography.Title>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={myPayments}
        columns={payCols}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: '暂无支付记录' }}
      />

      <Typography.Title level={5} style={{ marginBottom: 0 }}>
        我的电子票据
      </Typography.Title>
      <Descriptions size="small" column={1} style={{ marginBottom: 8 }}>
        <Descriptions.Item label="说明">
          电子票据与支付单一一对应；冲正后原票据冲红（reversed），可凭票据号在税务系统查验。
        </Descriptions.Item>
      </Descriptions>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={myInvoices}
        columns={invCols}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: '暂无电子票据' }}
      />
    </Space>
  );
}
