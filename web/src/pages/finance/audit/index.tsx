/** 健澜科技 jlmedaios - 财务审计（M325 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; period: string; auditItem: string; finding: string; rectification: string; status: string }
export default function FinanceAuditPage() {
  usePageTitle('财务审计');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/finance/audit').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '期间', dataIndex: 'period', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '审计项', dataIndex: 'auditItem' },
    { title: '发现', dataIndex: 'finding', ellipsis: true, render: (v: string) => <Tag color="orange">{v}</Tag> },
    { title: '整改', dataIndex: 'rectification', ellipsis: true },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已闭环' ? 'green' : v === '整改中' ? 'orange' : 'red'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="财务审计">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无审计" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}