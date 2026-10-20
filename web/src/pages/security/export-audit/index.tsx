/** 健澜科技 jlmedaios - 数据导出审批（M262 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; exporter: string; scope: string; time: string; approver: string; status: string }
export default function SecurityExportAuditPage() {
  usePageTitle('数据导出审批');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/security/export-audit').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.exports ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '申请人', dataIndex: 'exporter' },
    { title: '导出范围', dataIndex: 'scope' },
    { title: '申请时间', dataIndex: 'time' },
    { title: '审批人', dataIndex: 'approver' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已通过' ? 'green' : v === '已驳回' ? 'red' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="数据导出审批">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无申请" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
