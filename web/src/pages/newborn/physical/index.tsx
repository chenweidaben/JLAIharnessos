/** 健澜科技 jlmedaios - 新生儿体检（M332 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; baby: string; weight: string; length: string; headCircumference: string; assessment: string }
export default function NewbornPhysicalPage() {
  usePageTitle('新生儿体检');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/newborn/physical').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '婴儿', dataIndex: 'baby', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '体重', dataIndex: 'weight' },
    { title: '身长', dataIndex: 'length', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '头围', dataIndex: 'headCircumference' },
    { title: '评估', dataIndex: 'assessment', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (
    <PageContainer title="新生儿体检">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无新生儿体检" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}