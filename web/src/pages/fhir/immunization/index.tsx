/** 健澜科技 jlmedaios - FHIR Immunization（M273 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { resourceType: string; id: string; patientId: string; vaccineCode?: { cvx: string; display: string }; occurrenceDateTime?: string }
export default function FhirImmunizationPage() {
  usePageTitle('FHIR Immunization');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/fhir/immunization').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.entry ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: 'ID', dataIndex: 'id', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '患者', dataIndex: 'patientId' },
    { title: 'CVX', dataIndex: 'vaccineCode', render: (c?: { cvx: string; display: string }) => c?.cvx },
    { title: '疫苗', dataIndex: 'vaccineCode', render: (c?: { cvx: string; display: string }) => <Tag color="blue">{c?.display}</Tag> },
    { title: '接种时间', dataIndex: 'occurrenceDateTime' },
  ];
  return (
    <PageContainer title="FHIR Immunization 资源（预防接种）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无资源" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
