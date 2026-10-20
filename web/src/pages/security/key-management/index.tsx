/** 健澜科技 jlmedaios - 密钥管理（M264 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; type: string; length: string; rotation: string; status: string }
export default function SecurityKeyManagementPage() {
  usePageTitle('密钥管理');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/security/key-management').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.keys ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '密钥', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '类型', dataIndex: 'type' },
    { title: '长度', dataIndex: 'length' },
    { title: '轮换周期', dataIndex: 'rotation' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '有效' ? 'green' : 'red'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="密钥管理（KMS）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无密钥" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
