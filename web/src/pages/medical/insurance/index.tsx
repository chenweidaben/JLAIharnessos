/** 健澜科技 jlmedaios - 医保结算（M296 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; insuranceType: string; totalCost: string; reimbursement: string; selfPay: string }
export default function MedicalInsurancePage() {
  usePageTitle('医保结算');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/medical/insurance').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.settlements ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '类型', dataIndex: 'insuranceType', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '总费用', dataIndex: 'totalCost' },
    { title: '医保报销', dataIndex: 'reimbursement', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '自付', dataIndex: 'selfPay', render: (v: string) => <Tag color="red">{v}</Tag> },
  ];
  return (
    <PageContainer title="医保结算">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无结算" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}