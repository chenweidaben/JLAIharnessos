/** 健澜科技 jlmedaios - 诊断建议（M317 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { diagnosis: string; confidence: number; suggestedTests: string[] }
interface Data { inputSymptoms: string[]; differentialDiagnoses: Row[] }
export default function CdsDiagnosisSuggestPage() {
  usePageTitle('诊断建议');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/cds/diagnosis-suggest').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '鉴别诊断', dataIndex: 'diagnosis', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '置信度', dataIndex: 'confidence', render: (v: number) => <Tag color={v >= 80 ? 'green' : v >= 60 ? 'orange' : 'red'}>{v}%</Tag> },
    { title: '建议检查', dataIndex: 'suggestedTests', render: (v: string[]) => v.map((t) => <Tag key={t} color="blue">{t}</Tag>) },
  ];
  return (
    <PageContainer title="CDS 诊断建议" extra={data ? <span>症状：{data.inputSymptoms.map((s) => <Tag key={s} color="red">{s}</Tag>)}</span> : null}>
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Card><Table rowKey="diagnosis" columns={columns} dataSource={data.differentialDiagnoses} locale={{ emptyText: <Empty description="无建议" /> }} pagination={false} /></Card>
        ) : <Card><Empty description="暂无数据" /></Card>}
      </Spin>
    </PageContainer>
  );
}