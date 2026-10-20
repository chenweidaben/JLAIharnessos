/** 健澜科技 jlmedaios - 吞吐量（M275 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { date: string; outpatient: number; inpatientAdmit: number }
export default function BiThroughputPage() {
  usePageTitle('吞吐量');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/bi/throughput').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.dailyTrend ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '日期', dataIndex: 'date', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '门诊量', dataIndex: 'outpatient' },
    { title: '住院入院', dataIndex: 'inpatientAdmit' },
  ];
  return (
    <PageContainer title="吞吐量统计（日趋势）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="date" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无数据" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
