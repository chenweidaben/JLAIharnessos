/** 健澜科技 jlmedaios - 病历审计追踪（M261 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; recordNo: string; action: string; operator: string; time: string; ip: string }
export default function EmrAuditTrailPage() {
  usePageTitle('病历审计追踪');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/emr/audit-trail').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.trails ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '病历号', dataIndex: 'recordNo' },
    { title: '操作', dataIndex: 'action', render: (v: string) => <Tag color={v === '修改' ? 'orange' : v === '删除' ? 'red' : 'blue'}>{v}</Tag> },
    { title: '操作人', dataIndex: 'operator' },
    { title: '时间', dataIndex: 'time' },
    { title: 'IP', dataIndex: 'ip' },
  ];
  return (
    <PageContainer title="病历审计追踪">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无追踪" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
