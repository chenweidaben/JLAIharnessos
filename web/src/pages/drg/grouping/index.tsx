/** 健澜科技 jlmedaios - DRG 分组（M320 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; mainDiagnosis: string; drgCode: string; drgName: string; weight: string; reimbursement: string }
export default function DrgGroupingPage() {
  usePageTitle('DRG 分组');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/drg/grouping').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '主诊断', dataIndex: 'mainDiagnosis', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: 'DRG 编码', dataIndex: 'drgCode', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'DRG 名称', dataIndex: 'drgName' },
    { title: '权重', dataIndex: 'weight', render: (v: string) => <Tag color="orange">{v}</Tag> },
    { title: '支付', dataIndex: 'reimbursement', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (
    <PageContainer title="DRG 分组">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无分组" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}