/** 健澜科技 jlmedaios - 中药处方（M240 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; formula: string; ingredients: string; dosage: string; decoction: string; doctor: string }
export default function TcmPage() {
  usePageTitle('中药处方');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/tcm/recipes').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.recipes ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '方剂', dataIndex: 'formula', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '组成', dataIndex: 'ingredients' },
    { title: '用法', dataIndex: 'decoction' },
    { title: '开方医生', dataIndex: 'doctor' },
  ];
  return (
    <PageContainer title="中药处方">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无处方" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
