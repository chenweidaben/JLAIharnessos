/** 健澜科技 jlmedaios - 药物相互作用（M270 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; drugA: string; drugB: string; severity: string; advice: string }
export default function CdsInteractionCheckPage() {
  usePageTitle('药物相互作用');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/cds/interaction-check').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.interactions ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '药物 A', dataIndex: 'drugA' },
    { title: '药物 B', dataIndex: 'drugB' },
    { title: '严重度', dataIndex: 'severity', render: (v: string) => <Tag color={v === '严重' ? 'red' : v === '中等' ? 'orange' : 'blue'}>{v}</Tag> },
    { title: '建议', dataIndex: 'advice' },
  ];
  return (
    <PageContainer title="药物相互作用审查">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="未检出相互作用" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
