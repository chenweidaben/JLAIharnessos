/**
 * 健澜AI原生医院操作系统OS - 退药管理
 * 退药申请列表 + 退药审核 + 退药入库
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Space, Spin, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';

interface ReturnRow {
  id: string;
  returnNo: string;
  patient: string;
  dept: string;
  drugName: string;
  quantity: number;
  reason: string;
  applicant: string;
  status: '待审核' | '已审核' | '已入库' | '已驳回';
  applyTime: string;
}

const demoRows: ReturnRow[] = [
  { id: '1', returnNo: 'RT-20261103-001', patient: '张三', dept: '呼吸内科', drugName: '阿莫西林胶囊 0.25g*24粒', quantity: 2, reason: '患者过敏停药', applicant: '李医生', status: '待审核', applyTime: '2026-11-03 09:20' },
  { id: '2', returnNo: 'RT-20261103-002', patient: '王五', dept: '心血管内科', drugName: '阿司匹林肠溶片 100mg*30片', quantity: 1, reason: '医生调整方案', applicant: '赵医生', status: '已审核', applyTime: '2026-11-03 08:45' },
  { id: '3', returnNo: 'RT-20261102-003', patient: '刘六', dept: '消化内科', drugName: '奥美拉唑肠溶胶囊 20mg*14粒', quantity: 3, reason: '患者出院带药调整', applicant: '陈医生', status: '已入库', applyTime: '2026-11-02 16:30' },
];

export default function PharmacyReturnPage() {
  usePageTitle('退药管理');
  const [list, setList] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/v1/pharmacy/return/pending')
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const data = j.data?.list ?? j.data?.returns ?? [];
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

  const onAudit = async (row: ReturnRow, approve: boolean) => {
    try {
      await fetch('/api/v1/pharmacy/return/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, approve, auditor: '当前药师' }),
      });
      message.success(`退药申请 ${row.returnNo} ${approve ? '审核通过' : '已驳回'}`);
      setList((prev) => prev.map((r) => r.id === row.id ? { ...r, status: approve ? '已审核' : '已驳回' as const } : r));
    } catch {
      message.error('审核失败');
    }
  };

  const onStockIn = async (row: ReturnRow) => {
    try {
      await fetch('/api/v1/pharmacy/return/stock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
      message.success(`退药 ${row.returnNo} 已入库`);
      setList((prev) => prev.map((r) => r.id === row.id ? { ...r, status: '已入库' as const } : r));
    } catch {
      message.error('入库失败');
    }
  };

  const columns: ColumnsType<ReturnRow> = [
    { title: '退药单号', dataIndex: 'returnNo', render: (v: string) => <Tag color="orange">{v}</Tag> },
    { title: '患者', dataIndex: 'patient', width: 80 },
    { title: '科室', dataIndex: 'dept', width: 120 },
    { title: '药品', dataIndex: 'drugName' },
    { title: '数量', dataIndex: 'quantity', width: 70 },
    { title: '退药原因', dataIndex: 'reason' },
    { title: '申请人', dataIndex: 'applicant', width: 90 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: string) => {
        const color = v === '待审核' ? 'orange' : v === '已审核' ? 'blue' : v === '已入库' ? 'green' : 'red';
        return <Tag color={color}>{v}</Tag>;
      },
    },
    { title: '申请时间', dataIndex: 'applyTime', width: 160 },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, row) => (
        <Space size="small">
          {row.status === '待审核' && (
            <>
              <Button size="small" type="primary" onClick={() => void onAudit(row, true)}>通过</Button>
              <Button size="small" danger onClick={() => void onAudit(row, false)}>驳回</Button>
            </>
          )}
          {row.status === '已审核' && (
            <Button size="small" onClick={() => void onStockIn(row)}>确认入库</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="退药管理" description="退药申请审核与入库管理">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <Table rowKey="id" columns={columns} dataSource={list} pagination={{ pageSize: 10 }} size="middle" />
        </Card>
      </Spin>
    </PageContainer>
  );
}
