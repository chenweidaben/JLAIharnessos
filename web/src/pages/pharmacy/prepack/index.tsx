/**
 * 健澜AI原生医院操作系统OS - 住院摆药单
 * 摆药任务列表（按病区/时段分组）+ 摆药完成
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Spin, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';

interface PrepRow {
  id: string;
  ward: string;
  timeSlot: string;
  patientCount: number;
  drugCount: number;
  taskNo: string;
  status: '待摆药' | '摆药中' | '已完成';
  assignedTo: string;
}

const demoRows: PrepRow[] = [
  { id: '1', ward: '呼吸内科病区', timeSlot: '上午 8:00-10:00', patientCount: 24, drugCount: 56, taskNo: 'PREP-20261103-AM1', status: '待摆药', assignedTo: '' },
  { id: '2', ward: '心血管内科病区', timeSlot: '上午 8:00-10:00', patientCount: 18, drugCount: 42, taskNo: 'PREP-20261103-AM2', status: '摆药中', assignedTo: '药师-王XX' },
  { id: '3', ward: '消化内科病区', timeSlot: '中午 12:00-13:30', patientCount: 15, drugCount: 28, taskNo: 'PREP-20261103-PM1', status: '待摆药', assignedTo: '' },
  { id: '4', ward: '呼吸内科病区', timeSlot: '下午 16:00-17:30', patientCount: 22, drugCount: 48, taskNo: 'PREP-20261103-PM2', status: '已完成', assignedTo: '药师-李XX' },
];

export default function PharmacyPrepackPage() {
  usePageTitle('住院摆药单');
  const [list, setList] = useState<PrepRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/v1/pharmacy/prepack/tasks')
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const data = j.data?.list ?? j.data?.tasks ?? [];
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

  const onDone = async (row: PrepRow) => {
    try {
      await fetch(`/api/v1/pharmacy/prepack/${row.id}/done`, { method: 'POST' });
      message.success(`摆药任务 ${row.taskNo} 已完成`);
      setList((prev) => prev.map((r) => r.id === row.id ? { ...r, status: '已完成' as const } : r));
    } catch {
      message.error('操作失败');
    }
  };

  const columns: ColumnsType<PrepRow> = [
    { title: '任务号', dataIndex: 'taskNo', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '病区', dataIndex: 'ward' },
    { title: '时段', dataIndex: 'timeSlot', width: 160 },
    { title: '患者数', dataIndex: 'patientCount', width: 80 },
    { title: '药品项数', dataIndex: 'drugCount', width: 90 },
    { title: '负责药师', dataIndex: 'assignedTo', width: 110, render: (v: string) => v || '未分配' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: string) => {
        const color = v === '待摆药' ? 'orange' : v === '摆药中' ? 'blue' : 'green';
        return <Tag color={color}>{v}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, row) => (
        row.status !== '已完成' && (
          <Button size="small" type="primary" onClick={() => void onDone(row)}>完成摆药</Button>
        )
      ),
    },
  ];

  return (
    <PageContainer title="住院摆药单" description="按病区/时段分组的住院摆药任务管理">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <Table rowKey="id" columns={columns} dataSource={list} pagination={false} size="middle" />
        </Card>
      </Spin>
    </PageContainer>
  );
}
