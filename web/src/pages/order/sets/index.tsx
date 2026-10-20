/** 健澜科技 jlmedaios - 医嘱套餐（M287 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; itemCount: number; applicableDept: string; price: string; status: string }
export default function OrderSetsPage() {
  usePageTitle('医嘱套餐');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/order/sets').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.sets ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '套餐', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '项目数', dataIndex: 'itemCount' },
    { title: '适用科室', dataIndex: 'applicableDept' },
    { title: '价格', dataIndex: 'price' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '启用' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="医嘱套餐">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无套餐" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
