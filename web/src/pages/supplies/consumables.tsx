/** 健澜科技 jlmedaios - 高值耗材追溯（M244 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; udi: string; patient: string; useTime: string; surgeon: string; batchNo: string }
export default function SuppliesConsumablesPage() {
  usePageTitle('高值耗材追溯');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/supplies/consumables').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.consumables ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '耗材', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: 'UDI', dataIndex: 'udi' },
    { title: '使用患者', dataIndex: 'patient' },
    { title: '使用时间', dataIndex: 'useTime' },
    { title: '手术医生', dataIndex: 'surgeon' },
    { title: '批号', dataIndex: 'batchNo' },
  ];
  return (
    <PageContainer title="高值耗材追溯（UDI）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无追溯" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
