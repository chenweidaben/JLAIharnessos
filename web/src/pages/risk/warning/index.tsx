/** 健澜科技 jlmedaios - 风险预警（M327 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; item: string; level: string; desc: string; time: string; handleStatus: string }
export default function RiskWarningPage() {
  usePageTitle('风险预警');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/risk/warning').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '预警项', dataIndex: 'item', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '级别', dataIndex: 'level', render: (v: string) => <Tag color={v.includes('红') ? 'red' : v.includes('橙') ? 'orange' : 'blue'}>{v}</Tag> },
    { title: '描述', dataIndex: 'desc', ellipsis: true },
    { title: '时间', dataIndex: 'time' },
    { title: '处置', dataIndex: 'handleStatus', ellipsis: true, render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (
    <PageContainer title="风险预警">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无预警" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}