/** 健澜科技 jlmedaios - 护理质量趋势（M318 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { month: string; indicator: string; actual: number; target: number }
export default function NursingNqiTrendPage() {
  usePageTitle('护理质量趋势');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/nursing/nqi-trend').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.trend ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '月份', dataIndex: 'month', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '指标', dataIndex: 'indicator' },
    { title: '实际', dataIndex: 'actual', render: (v: number) => <Tag color="blue">{v}</Tag> },
    { title: '目标', dataIndex: 'target', render: (v: number) => <Tag color="green">{v}</Tag> },
  ];
  return (
    <PageContainer title="护理质量趋势">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="month" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无趋势" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}