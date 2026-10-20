/** 健澜科技 jlmedaios - 营养评估（M336 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; indicator: string; score: string; risk: string; advice: string }
export default function ElderlyNutritionPage() {
  usePageTitle('营养评估');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/elderly/nutrition').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '评估指标', dataIndex: 'indicator', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '评分', dataIndex: 'score', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '营养风险', dataIndex: 'risk', render: (v: string) => <Tag color={v.includes('无') ? 'green' : v.includes('风险') ? 'orange' : 'red'}>{v}</Tag> },
    { title: '建议', dataIndex: 'advice', ellipsis: true },
  ];
  return (
    <PageContainer title="营养评估">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无营养评估" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}