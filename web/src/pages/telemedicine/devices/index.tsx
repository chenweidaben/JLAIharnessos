/** 健澜科技 jlmedaios - 远程设备（M350 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; deviceName: string; model: string; location: string; status: string; maintenanceTime: string }
export default function TelemedicineDevicesPage() {
  usePageTitle('远程设备');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/telemedicine/devices').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '设备名', dataIndex: 'deviceName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '型号', dataIndex: 'model', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '位置', dataIndex: 'location' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v.includes('正常') ? 'green' : 'red'}>{v}</Tag> },
    { title: '维护时间', dataIndex: 'maintenanceTime' },
  ];
  return (<PageContainer title="远程设备"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无设备" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}