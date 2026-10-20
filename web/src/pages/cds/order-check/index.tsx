/** 健澜科技 jlmedaios - 医嘱合理性审查（M276 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; order: string; issueType: string; severity: string; advice: string; status: string }
export default function CdsOrderCheckPage() {
  usePageTitle('医嘱合理性审查');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/cds/order-check').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.orders ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '医嘱', dataIndex: 'order' },
    { title: '问题类型', dataIndex: 'issueType', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '严重度', dataIndex: 'severity', render: (v: string) => <Tag color={v === '严重' ? 'red' : 'orange'}>{v}</Tag> },
    { title: '建议', dataIndex: 'advice' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已修改' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="CDS 医嘱合理性审查">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无问题" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
