/** 健澜科技 jlmedaios - 影像提示（M339 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; bodyPart: string; hint: string; suggestion: string; confidence: string }
export default function CdsImagingHintPage() {
  usePageTitle('影像提示');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/cds/imaging-hint').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '部位', dataIndex: 'bodyPart', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '影像描述', dataIndex: 'hint', ellipsis: true },
    { title: '建议', dataIndex: 'suggestion', ellipsis: true, render: (v: string) => <Tag color="orange">{v}</Tag> },
    { title: '置信度', dataIndex: 'confidence', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (
    <PageContainer title="影像提示">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无影像提示" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}