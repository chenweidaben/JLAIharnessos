/** 健澜科技 jlmedaios - 费用支出（M356 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; expenseItem: string; department: string; amount: string; time: string; approver: string }
export default function FinanceExpensesPage() {
  usePageTitle('费用支出');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/finance/expenses').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '支出项', dataIndex: 'expenseItem', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '科室', dataIndex: 'department' },
    { title: '金额', dataIndex: 'amount', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '时间', dataIndex: 'time' },
    { title: '审批人', dataIndex: 'approver' },
  ];
  return (<PageContainer title="费用支出"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无支出" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}