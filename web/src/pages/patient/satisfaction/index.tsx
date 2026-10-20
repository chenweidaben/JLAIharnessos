/** 健澜科技 jlmedaios - 患者满意度（M297 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Question { name: string; maxScore: number; avgScore: number }
interface Data { title: string; period: string; questions: Question[] }
export default function PatientSatisfactionPage() {
  usePageTitle('患者满意度');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/patient/satisfaction').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Question> = [
    { title: '调查项', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '满分', dataIndex: 'maxScore' },
    { title: '平均分', dataIndex: 'avgScore', render: (v: number) => <Tag color={v >= 4.5 ? 'green' : v >= 4 ? 'blue' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title={data?.title ?? '患者满意度'} extra={data?.period ? <Tag color="blue">{data.period}</Tag> : null}>
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Card><Table rowKey="name" columns={columns} dataSource={data.questions} locale={{ emptyText: <Empty description="暂无调查" /> }} pagination={false} /></Card>
        ) : <Card><Empty description="暂无调查" /></Card>}
      </Spin>
    </PageContainer>
  );
}
