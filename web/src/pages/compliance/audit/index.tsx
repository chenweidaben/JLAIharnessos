/** 健澜科技 jlmedaios - 合规审计日志（M258 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; operator: string; actionType: string; target: string; result: string; time: string }
export default function ComplianceAuditPage() {
  usePageTitle('合规审计日志');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/compliance/audit').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.logs ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '操作人', dataIndex: 'operator' },
    { title: '操作类型', dataIndex: 'actionType', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '对象', dataIndex: 'target' },
    { title: '结果', dataIndex: 'result', render: (v: string) => <Tag color={v.startsWith('通过') ? 'green' : 'red'}>{v}</Tag> },
    { title: '时间', dataIndex: 'time' },
  ];
  return (
    <PageContainer title="合规审计日志">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无日志" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
