/**
 * 健澜科技 jlmedaios - 互联网在线支付 · 财务/药师端视图（M3-M）
 *
 * 支付队列（已支付可冲正）→ 冲正 Modal（原因必填）→ 支付单 cancelled +
 * 票据冲红 + 处方回 returned；票据台账。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useState } from 'react';
import {
  App,
  Button,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useInternetPaymentStore } from '../../store/internetPaymentStore';
import type { OnlinePaymentView, EInvoiceView } from '../../types/internetPayment';

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

export function FinanceView() {
  const { message } = App.useApp();
  const {
    healthOk,
    loading,
    submitting,
    financeQueue,
    financeInvoices,
    loadFinance,
    refundPayment,
  } = useInternetPaymentStore();
  const [refundTarget, setRefundTarget] = useState<OnlinePaymentView | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (healthOk) loadFinance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [healthOk]);

  const doRefund = async () => {
    if (!refundTarget) return;
    if (!reason.trim()) {
      message.warning('请填写冲正原因（必填）');
      return;
    }
    try {
      const r = await refundPayment(refundTarget.id, reason.trim());
      message.success(`冲正完成：支付单 ${r.payment.payNo} 已取消，原票据已冲红`);
      setRefundTarget(null);
      setReason('');
    } catch (e) {
      message.error((e as Error).message ?? '冲正失败');
    }
  };

  const payCols: ColumnsType<OnlinePaymentView> = [
    { title: '支付单号', dataIndex: 'payNo', key: 'payNo' },
    {
      title: '来源处方',
      dataIndex: 'sourceId',
      key: 'sourceId',
      render: (v: string) => v?.slice(0, 8) ?? '-',
    },
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
      title: '操作',
      key: 'op',
      render: (_, p) =>
        p.status === 'paid' ? (
          <Button
            size="small"
            danger
            loading={submitting}
            disabled={!healthOk}
            onClick={() => setRefundTarget(p)}
          >
            冲正
          </Button>
        ) : null,
    },
  ];

  const invCols: ColumnsType<EInvoiceView> = [
    { title: '票据号', dataIndex: 'invoiceNo', key: 'invoiceNo' },
    { title: '对应支付单', dataIndex: 'paymentId', key: 'paymentId', render: (v: string) => v?.slice(0, 8) ?? '-' },
    { title: '金额', key: 'amount', render: (_, v) => fmt(v.amount) },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => statusTag(s),
    },
    {
      title: '冲红自',
      dataIndex: 'reversalOf',
      key: 'reversalOf',
      render: (v: string | null) => (v ? <Tag color="volcano">{v.slice(0, 8)}</Tag> : '-'),
    },
    { title: '开票时间', dataIndex: 'issuedAt', key: 'issuedAt', render: (v: string) => v?.slice(0, 19) ?? '-' },
  ];

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Typography.Title level={5} style={{ marginBottom: 0 }}>
        支付队列
      </Typography.Title>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={financeQueue}
        columns={payCols}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: '暂无支付记录' }}
      />

      <Typography.Title level={5} style={{ marginBottom: 0 }}>
        电子票据台账
      </Typography.Title>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={financeInvoices}
        columns={invCols}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: '暂无票据记录' }}
      />

      <Modal
        open={refundTarget !== null}
        title={`冲正支付单 ${refundTarget?.payNo ?? ''}`}
        okText="确认冲正"
        okButtonProps={{ danger: true, loading: submitting }}
        cancelText="取消"
        onOk={doRefund}
        onCancel={() => {
          setRefundTarget(null);
          setReason('');
        }}
      >
        <p style={{ marginBottom: 8 }}>
          冲正后：支付单取消、原电子票据冲红、处方状态回到「已退回」，由医生修改后重新提交审方。
          该操作将写入审计日志（高风险），请谨慎执行。
        </p>
        <Input.TextArea
          placeholder="请填写冲正原因（必填，将记入审计）"
          value={reason}
          maxLength={200}
          showCount
          onChange={(e) => setReason(e.target.value)}
        />
      </Modal>
    </Space>
  );
}
