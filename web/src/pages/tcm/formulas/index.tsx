/** 健澜科技 jlmedaios - 中医方剂（M311 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; category: string; composition: string; indication: string; usageCount: number }
export default function TcmFormulasPage() {
  usePageTitle('中医方剂');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/tcm/formulas').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.formulas ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '方名', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '类别', dataIndex: 'category', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '组成', dataIndex: 'composition' },
    { title: '主治', dataIndex: 'indication' },
    { title: '使用次数', dataIndex: 'usageCount' },
  ];
  return (
    <PageContainer title="中医方剂库">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无方剂" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}