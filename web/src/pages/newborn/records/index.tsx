/** 健澜科技 jlmedaios - 新生儿记录（M284 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; baby: string; weight: number; length: number; apgar: number; status: string }
export default function NewbornRecordsPage() {
  usePageTitle('新生儿记录');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/newborn/records').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.babies ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '婴儿', dataIndex: 'baby' },
    { title: '体重(g)', dataIndex: 'weight' },
    { title: '身长(cm)', dataIndex: 'length' },
    { title: 'Apgar', dataIndex: 'apgar', render: (v: number) => <Tag color={v >= 9 ? 'green' : 'orange'}>{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '正常' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="新生儿记录">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无记录" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}