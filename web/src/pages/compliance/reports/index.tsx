/** 健澜科技 jlmedaios - 合规报告（M258 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; type: string; date: string; author: string; status: string }
export default function ComplianceReportsPage() {
  usePageTitle('合规报告');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/compliance/reports').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.reports ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '报告', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '日期', dataIndex: 'date' },
    { title: '起草部门', dataIndex: 'author' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已归档' ? 'green' : v === '审核中' ? 'orange' : 'default'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="合规报告">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无报告" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
