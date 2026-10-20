/** 健澜科技 jlmedaios - 诊断建议（M339 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; symptoms: string; suggestedDiagnosis: string; basis: string; confidence: string }
export default function CdsDiagnosisSuggestionPage() {
  usePageTitle('诊断建议');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/cds/diagnosis-suggestion').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '症状', dataIndex: 'symptoms', ellipsis: true },
    { title: '建议诊断', dataIndex: 'suggestedDiagnosis', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '依据', dataIndex: 'basis', ellipsis: true },
    { title: '置信度', dataIndex: 'confidence', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (
    <PageContainer title="诊断建议">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无诊断建议" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}