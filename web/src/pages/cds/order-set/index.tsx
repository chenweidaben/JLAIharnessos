/** 健澜科技 jlmedaios - CDS 医嘱套餐（M285 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id?: string; disease: string; defaultOrders: string[]; adjustable: string[]; notes: string }
export default function CdsOrderSetPage() {
  usePageTitle('CDS 医嘱套餐');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/cds/order-set').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.orderSets ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '疾病', dataIndex: 'disease', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '默认医嘱', dataIndex: 'defaultOrders', render: (v: string[]) => v.map((x) => <Tag key={x} color="blue" style={{ marginLeft: 2 }}>{x}</Tag>) },
    { title: '可调', dataIndex: 'adjustable', render: (v: string[]) => v.map((x) => <Tag key={x} color="orange" style={{ marginLeft: 2 }}>{x}</Tag>) },
    { title: '注意', dataIndex: 'notes' },
  ];
  return (
    <PageContainer title="CDS 医嘱套餐审查">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="disease" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无套餐" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
