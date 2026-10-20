/** 健澜科技 jlmedaios - 药物剂量调整（M339 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; drug: string; originalDose: string; adjustedDose: string; reason: string }
export default function CdsDrugDoseAdjustPage() {
  usePageTitle('药物剂量调整');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/cds/drug-dose-adjust').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '药物', dataIndex: 'drug', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '原剂量', dataIndex: 'originalDose' },
    { title: '调整后', dataIndex: 'adjustedDose', render: (v: string) => <Tag color="orange">{v}</Tag> },
    { title: '调整原因', dataIndex: 'reason', ellipsis: true },
  ];
  return (
    <PageContainer title="药物剂量调整">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无剂量调整" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}