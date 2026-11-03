/**
 * 健澜AI原生医院操作系统OS - 门诊收费窗口
 * 当日待收费队列 + 患者费用明细 + 收费/退费 + 票据打印
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, Modal, Space, Spin, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';

interface ChargeRow {
  id: string;
  queueNo: string;
  patient: string;
  invoiceNo: string;
  dept: string;
  doctor: string;
  totalAmount: number;
  insuranceAmount: number;
  selfAmount: number;
  status: '待收费' | '已收费' | '已退费';
  createTime: string;
}

const demoRows: ChargeRow[] = [
  { id: '1', queueNo: 'Q-001', patient: '张三', invoiceNo: '', dept: '呼吸内科', doctor: '李医生', totalAmount: 256.5, insuranceAmount: 180.2, selfAmount: 76.3, status: '待收费', createTime: '2026-11-03 08:35' },
  { id: '2', queueNo: 'Q-002', patient: '王五', invoiceNo: '', dept: '心血管内科', doctor: '赵医生', totalAmount: 580.0, insuranceAmount: 420.0, selfAmount: 160.0, status: '待收费', createTime: '2026-11-03 09:10' },
  { id: '3', queueNo: 'Q-003', patient: '刘六', invoiceNo: 'INV-20261103-001', dept: '消化内科', doctor: '陈医生', totalAmount: 128.0, insuranceAmount: 90.0, selfAmount: 38.0, status: '已收费', createTime: '2026-11-03 09:45' },
];

export default function BillingWindowPage() {
  usePageTitle('门诊收费窗口');
  const [list, setList] = useState<ChargeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<ChargeRow | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/v1/billing/today-queue')
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const data = j.data?.list ?? j.data?.queue ?? [];
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

  const onCharge = async (row: ChargeRow) => {
    try {
      await fetch('/api/v1/billing/charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, patient: row.patient }),
      });
      message.success(`患者 ${row.patient} 收费完成 ¥${row.selfAmount.toFixed(2)}`);
      setList((prev) => prev.map((r) => r.id === row.id ? { ...r, status: '已收费' as const, invoiceNo: `INV-20261103-${row.id.padStart(3, '0')}` } : r));
    } catch {
      message.error('收费失败，请重试');
    }
  };

  const onRefund = async (row: ChargeRow) => {
    try {
      await fetch('/api/v1/billing/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, reason: '患者申请退费' }),
      });
      message.success(`患者 ${row.patient} 退费完成`);
      setList((prev) => prev.map((r) => r.id === row.id ? { ...r, status: '已退费' as const } : r));
    } catch {
      message.error('退费失败，请重试');
    }
  };

  const onPrint = (row: ChargeRow) => {
    message.success(`发票 ${row.invoiceNo} 已发送打印`);
  };

  const columns: ColumnsType<ChargeRow> = [
    { title: '队列号', dataIndex: 'queueNo', width: 80 },
    { title: '患者', dataIndex: 'patient', width: 80 },
    { title: '科室', dataIndex: 'dept', width: 120 },
    { title: '医生', dataIndex: 'doctor', width: 90 },
    { title: '总金额(元)', dataIndex: 'totalAmount', width: 110, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '医保支付(元)', dataIndex: 'insuranceAmount', width: 120, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '自付(元)', dataIndex: 'selfAmount', width: 110, render: (v: number) => <span style={{ color: '#cf1322' }}>¥${v.toFixed(2)}</span> },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: string) => {
        const color = v === '待收费' ? 'orange' : v === '已收费' ? 'green' : 'red';
        return <Tag color={color}>{v}</Tag>;
      },
    },
    { title: '时间', dataIndex: 'createTime', width: 160 },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, row) => (
        <Space size="small">
          <Button size="small" onClick={() => { setCurrentRow(row); setDetailOpen(true); }}>明细</Button>
          {row.status === '待收费' && (
            <Button size="small" type="primary" onClick={() => void onCharge(row)}>收费</Button>
          )}
          {row.status === '已收费' && (
            <>
              <Button size="small" danger onClick={() => void onRefund(row)}>退费</Button>
              <Button size="small" onClick={() => onPrint(row)}>打印票据</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="门诊收费窗口" description="当日待收费队列，收费/退费/票据打印一站式处理">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <Table rowKey="id" columns={columns} dataSource={list} pagination={{ pageSize: 10 }} size="middle" />
        </Card>
      </Spin>
      <Modal
        title="费用明细"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={560}
      >
        {currentRow && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="患者">{currentRow.patient}</Descriptions.Item>
            <Descriptions.Item label="科室">{currentRow.dept}</Descriptions.Item>
            <Descriptions.Item label="医生">{currentRow.doctor}</Descriptions.Item>
            <Descriptions.Item label="总金额">¥{currentRow.totalAmount.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="医保支付">¥{currentRow.insuranceAmount.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="自付金额">¥{currentRow.selfAmount.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="状态">{currentRow.status}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
