/** 健澜科技 jlmedaios - 每日统计（M296 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; date: string; outpatientVolume: number; inpatientVolume: number; surgeryCount: number; revenue: string }
export default function StatisticsDailyPage() {
  usePageTitle('每日统计');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/statistics/daily').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.dailyStats ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '日期', dataIndex: 'date', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '门诊量', dataIndex: 'outpatientVolume' },
    { title: '入院量', dataIndex: 'inpatientVolume' },
    { title: '手术数', dataIndex: 'surgeryCount' },
    { title: '收入', dataIndex: 'revenue', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (
    <PageContainer title="每日运营统计">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无数据" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}