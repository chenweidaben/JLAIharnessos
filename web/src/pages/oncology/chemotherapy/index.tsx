/** 健澜科技 jlmedaios - 化疗方案（M334 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; regimenName: string; drugs: string; dosage: string; cycle: string; indication: string }
export default function OncologyChemotherapyPage() {
  usePageTitle('化疗方案');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/oncology/chemotherapy').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '方案名', dataIndex: 'regimenName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '药物', dataIndex: 'drugs' },
    { title: '剂量', dataIndex: 'dosage', ellipsis: true },
    { title: '周期', dataIndex: 'cycle', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '适应症', dataIndex: 'indication', ellipsis: true },
  ];
  return (
    <PageContainer title="化疗方案">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无化疗方案" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}