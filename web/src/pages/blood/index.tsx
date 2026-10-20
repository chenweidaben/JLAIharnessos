/** 健澜科技 jlmedaios - 血液库存（M236 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; bloodType: string; component: string; volume: number; receiveDate: string; validUntil: string; status: string }
export default function BloodPage() {
  usePageTitle('血液库存');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/blood/inventory').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.inventory ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '血型', dataIndex: 'bloodType', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '成分', dataIndex: 'component' },
    { title: '血量(U)', dataIndex: 'volume' },
    { title: '入库日期', dataIndex: 'receiveDate' },
    { title: '效期', dataIndex: 'validUntil' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '充足' ? 'green' : v === '紧张' ? 'orange' : 'red'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="血液库存">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无库存" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
