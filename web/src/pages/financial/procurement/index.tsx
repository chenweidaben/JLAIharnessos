/** 健澜科技 jlmedaios - 采购管理（M316 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; project: string; amount: string; supplier: string; status: string; date: string }
export default function FinancialProcurementPage() {
  usePageTitle('采购管理');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/financial/procurement').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '项目', dataIndex: 'project', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '金额', dataIndex: 'amount', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '供应商', dataIndex: 'supplier' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已签订合同' ? 'green' : v === '审批中' ? 'blue' : 'orange'}>{v}</Tag> },
    { title: '日期', dataIndex: 'date' },
  ];
  return (
    <PageContainer title="采购管理">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无采购" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}