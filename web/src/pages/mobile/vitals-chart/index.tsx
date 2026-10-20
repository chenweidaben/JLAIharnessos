/** 健澜科技 jlmedaios - 体征趋势（M276 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; vital: string; value: string; time: string; trend: string }
export default function MobileVitalsChartPage() {
  usePageTitle('体征趋势');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/mobile/vitals-chart').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.vitals ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '指标', dataIndex: 'vital', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '值', dataIndex: 'value' },
    { title: '时间', dataIndex: 'time' },
    { title: '趋势', dataIndex: 'trend', render: (v: string) => <Tag color={v === '平稳' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="移动体征趋势">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无数据" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
