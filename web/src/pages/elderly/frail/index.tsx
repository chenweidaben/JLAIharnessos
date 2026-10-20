/** 健澜科技 jlmedaios - 衰弱评估（M336 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; indicators: string; score: string; grade: string; advice: string }
export default function ElderlyFrailPage() {
  usePageTitle('衰弱评估');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/elderly/frail').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '衰弱指标', dataIndex: 'indicators', ellipsis: true },
    { title: '评分', dataIndex: 'score', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '分级', dataIndex: 'grade', render: (v: string) => <Tag color={v.includes('衰弱') ? 'red' : v.includes('前期') ? 'orange' : 'green'}>{v}</Tag> },
    { title: '建议', dataIndex: 'advice', ellipsis: true },
  ];
  return (
    <PageContainer title="衰弱评估">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无衰弱评估" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}