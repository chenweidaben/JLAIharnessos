/** 健澜科技 jlmedaios - 资产管理（M316 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; category: string; originalValue: string; status: string; dept: string }
export default function FinancialAssetsPage() {
  usePageTitle('资产管理');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/financial/assets').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.assets ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '资产名', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '类别', dataIndex: 'category' },
    { title: '原值', dataIndex: 'originalValue', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '使用科室', dataIndex: 'dept' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '在用' ? 'green' : v === '维修中' ? 'orange' : 'red'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="资产管理">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无资产" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}