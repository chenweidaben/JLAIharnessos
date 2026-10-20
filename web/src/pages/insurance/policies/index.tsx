/** 健澜科技 jlmedaios - 医保政策（M284 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; type: string; reimbursementRate: string; effectiveDate: string; status: string }
export default function InsurancePoliciesPage() {
  usePageTitle('医保政策');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/insurance/policies').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.policies ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '政策', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '类型', dataIndex: 'type' },
    { title: '报销比例', dataIndex: 'reimbursementRate' },
    { title: '生效日期', dataIndex: 'effectiveDate' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '有效' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="医保政策">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无政策" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}