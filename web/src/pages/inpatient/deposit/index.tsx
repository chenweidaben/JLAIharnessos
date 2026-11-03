/**
 * 健澜AI原生医院操作系统OS - 住院押金窗口
 * 在院患者押金余额列表 + 押金收取/退费表单 + 押金台账
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, InputNumber, Modal, Space, Spin, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';

interface DepositRow {
  id: string;
  patient: string;
  bedNo: string;
  dept: string;
  admissionNo: string;
  prepaidAmount: number;
  consumedAmount: number;
  balance: number;
  status: '正常' | '欠费' | '押金不足';
}

const demoRows: DepositRow[] = [
  { id: '1', patient: '张三', bedNo: '呼吸科-12床', dept: '呼吸内科', admissionNo: 'ADM-20261101-001', prepaidAmount: 5000, consumedAmount: 3200.5, balance: 1799.5, status: '正常' },
  { id: '2', patient: '王五', bedNo: '心内科-08床', dept: '心血管内科', admissionNo: 'ADM-20261102-003', prepaidAmount: 10000, consumedAmount: 12500, balance: -2500, status: '欠费' },
  { id: '3', patient: '刘六', bedNo: '消化科-21床', dept: '消化内科', admissionNo: 'ADM-20261103-005', prepaidAmount: 3000, consumedAmount: 2850, balance: 150, status: '押金不足' },
];

export default function InpatientDepositPage() {
  usePageTitle('住院押金窗口');
  const [list, setList] = useState<DepositRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<DepositRow | null>(null);
  const [chargeForm] = Form.useForm();
  const [refundForm] = Form.useForm();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/v1/deposit/prepay')
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const data = j.data?.list ?? j.data?.patients ?? [];
        setList(Array.isArray(data) && data.length > 0 ? data : demoRows);
      })
      .catch((e: Error) => {
        if (!alive) return;
        setError(e.message);
        setList(demoRows);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const onCharge = async () => {
    if (!currentRow) return;
    const vals = await chargeForm.validateFields();
    try {
      await fetch('/api/v1/deposit/prepay/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentRow.id, amount: vals.amount, paymentMethod: vals.method }),
      });
      message.success(`患者 ${currentRow.patient} 押金收取 ¥${vals.amount}`);
      setList((prev) => prev.map((r) => r.id === currentRow.id ? {
        ...r,
        prepaidAmount: r.prepaidAmount + vals.amount,
        balance: r.balance + vals.amount,
        status: r.balance + vals.amount > 500 ? '正常' : '押金不足',
      } : r));
      setChargeOpen(false);
    } catch {
      message.error('押金收取失败');
    }
  };

  const onRefund = async () => {
    if (!currentRow) return;
    const vals = await refundForm.validateFields();
    try {
      await fetch('/api/v1/deposit/prepay/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentRow.id, amount: vals.amount, reason: vals.reason }),
      });
      message.success(`患者 ${currentRow.patient} 押金退还 ¥${vals.amount}`);
      setList((prev) => prev.map((r) => r.id === currentRow.id ? { ...r, balance: r.balance - vals.amount } : r));
      setRefundOpen(false);
    } catch {
      message.error('押金退还失败');
    }
  };

  const columns: ColumnsType<DepositRow> = [
    { title: '住院号', dataIndex: 'admissionNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '患者', dataIndex: 'patient', width: 80 },
    { title: '床号', dataIndex: 'bedNo', width: 120 },
    { title: '科室', dataIndex: 'dept', width: 120 },
    { title: '已交押金(元)', dataIndex: 'prepaidAmount', width: 120, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '已消费(元)', dataIndex: 'consumedAmount', width: 110, render: (v: number) => `¥${v.toFixed(2)}` },
    {
      title: '余额(元)',
      dataIndex: 'balance',
      width: 110,
      render: (v: number) => <span style={{ color: v < 0 ? '#cf1322' : v < 500 ? '#fa8c16' : '#389e0d' }}>¥${v.toFixed(2)}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => {
        const color = v === '正常' ? 'green' : v === '欠费' ? 'red' : 'orange';
        return <Tag color={color}>{v}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, row) => (
        <Space size="small">
          <Button size="small" type="primary" onClick={() => { setCurrentRow(row); chargeForm.resetFields(); setChargeOpen(true); }}>收押金</Button>
          <Button size="small" onClick={() => { setCurrentRow(row); refundForm.resetFields(); setRefundOpen(true); }}>退押金</Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="住院押金窗口" description="在院患者押金余额管理，收取/退还押金">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <Table rowKey="id" columns={columns} dataSource={list} pagination={{ pageSize: 10 }} size="middle" />
        </Card>
      </Spin>
      <Modal title={`收取押金 - ${currentRow?.patient ?? ''}`} open={chargeOpen} onOk={() => void onCharge()} onCancel={() => setChargeOpen(false)} okText="确认收取">
        <Form form={chargeForm} layout="vertical">
          <Form.Item name="amount" label="收取金额(元)" rules={[{ required: true, message: '请输入金额' }]}>
            <InputNumber min={100} max={50000} step={100} style={{ width: '100%' }} placeholder="请输入押金金额" />
          </Form.Item>
          <Form.Item name="method" label="支付方式" initialValue="现金">
            <Input placeholder="现金/银行卡/微信/支付宝" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal title={`退还押金 - ${currentRow?.patient ?? ''}`} open={refundOpen} onOk={() => void onRefund()} onCancel={() => setRefundOpen(false)} okText="确认退还">
        <Form form={refundForm} layout="vertical">
          <Form.Item name="amount" label="退还金额(元)" rules={[{ required: true, message: '请输入金额' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入退还金额" />
          </Form.Item>
          <Form.Item name="reason" label="退还原因" rules={[{ required: true, message: '请输入原因' }]}>
            <Input.TextArea rows={2} placeholder="请输入退还原因" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
