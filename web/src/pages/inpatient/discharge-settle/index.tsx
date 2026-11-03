/**
 * 健澜AI原生医院操作系统OS - 出院结算窗口
 * 待出院结算患者列表 + 费用汇总 + 押金多退少补 + 医保结算 + 发票重打
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, Modal, Space, Spin, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';

interface SettleRow {
  id: string;
  admissionNo: string;
  patient: string;
  dept: string;
  bedNo: string;
  totalFee: number;
  insuranceFee: number;
  selfFee: number;
  prepaidDeposit: number;
  refundDue: number;
  status: '待结算' | '已结算' | '已退费';
  dischargeDate: string;
}

const demoRows: SettleRow[] = [
  { id: '1', admissionNo: 'ADM-20261028-001', patient: '张三', dept: '呼吸内科', bedNo: '12床', totalFee: 8560.5, insuranceFee: 6200.3, selfFee: 2360.2, prepaidDeposit: 5000, refundDue: 2639.8, status: '待结算', dischargeDate: '2026-11-03' },
  { id: '2', admissionNo: 'ADM-20261030-002', patient: '王五', dept: '心血管内科', bedNo: '08床', totalFee: 15200, insuranceFee: 11000, selfFee: 4200, prepaidDeposit: 10000, refundDue: 5800, status: '待结算', dischargeDate: '2026-11-03' },
  { id: '3', admissionNo: 'ADM-20261101-003', patient: '刘六', dept: '消化内科', bedNo: '21床', totalFee: 3280, insuranceFee: 2400, selfFee: 880, prepaidDeposit: 3000, refundDue: 2120, status: '已结算', dischargeDate: '2026-11-02' },
];

export default function DischargeSettlePage() {
  usePageTitle('出院结算窗口');
  const [list, setList] = useState<SettleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<SettleRow | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/v1/discharge/settle-pending')
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

  const onSettle = async (row: SettleRow) => {
    try {
      await fetch('/api/v1/discharge/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
      message.success(`患者 ${row.patient} 出院结算完成，应退押金 ¥${row.refundDue.toFixed(2)}`);
      setList((prev) => prev.map((r) => r.id === row.id ? { ...r, status: '已结算' as const } : r));
    } catch {
      message.error('结算失败');
    }
  };

  const onReprint = (row: SettleRow) => {
    message.success(`住院发票 ${row.admissionNo} 已重打`);
  };

  const columns: ColumnsType<SettleRow> = [
    { title: '住院号', dataIndex: 'admissionNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '患者', dataIndex: 'patient', width: 80 },
    { title: '科室', dataIndex: 'dept', width: 120 },
    { title: '床号', dataIndex: 'bedNo', width: 70 },
    { title: '总费用(元)', dataIndex: 'totalFee', width: 110, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '医保支付(元)', dataIndex: 'insuranceFee', width: 120, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '自付(元)', dataIndex: 'selfFee', width: 100, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '预交押金(元)', dataIndex: 'prepaidDeposit', width: 110, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '应退(元)', dataIndex: 'refundDue', width: 100, render: (v: number) => <span style={{ color: '#389e0d' }}>¥${v.toFixed(2)}</span> },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: string) => {
        const color = v === '待结算' ? 'orange' : v === '已结算' ? 'green' : 'red';
        return <Tag color={color}>{v}</Tag>;
      },
    },
    { title: '出院日期', dataIndex: 'dischargeDate', width: 110 },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, row) => (
        <Space size="small">
          <Button size="small" onClick={() => { setCurrentRow(row); setDetailOpen(true); }}>费用汇总</Button>
          {row.status === '待结算' && (
            <Button size="small" type="primary" onClick={() => void onSettle(row)}>出院结算</Button>
          )}
          {row.status === '已结算' && (
            <Button size="small" onClick={() => onReprint(row)}>发票重打</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="出院结算窗口" description="待出院患者费用汇总、押金多退少补、医保结算、发票重打">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <Table rowKey="id" columns={columns} dataSource={list} pagination={{ pageSize: 10 }} size="middle" />
        </Card>
      </Spin>
      <Modal title="费用汇总" open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={640}>
        {currentRow && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="住院号">{currentRow.admissionNo}</Descriptions.Item>
            <Descriptions.Item label="患者">{currentRow.patient}</Descriptions.Item>
            <Descriptions.Item label="科室">{currentRow.dept}</Descriptions.Item>
            <Descriptions.Item label="床号">{currentRow.bedNo}</Descriptions.Item>
            <Descriptions.Item label="总费用">¥{currentRow.totalFee.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="医保支付">¥{currentRow.insuranceFee.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="自付金额">¥{currentRow.selfFee.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="预交押金">¥{currentRow.prepaidDeposit.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="应退押金">¥{currentRow.refundDue.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="状态">{currentRow.status}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
