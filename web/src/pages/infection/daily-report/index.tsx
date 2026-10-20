/** 健澜科技 jlmedaios - 院感日报（M321 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { date: string; dept: string; newCases: number; rate: string; measure: string }
export default function InfectionDailyReportPage() {
  usePageTitle('院感日报');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/infection/daily-report').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '日期', dataIndex: 'date' },
    { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '新发', dataIndex: 'newCases', render: (v: number) => <Tag color={v > 0 ? 'red' : 'green'}>{v}</Tag> },
    { title: '感染率', dataIndex: 'rate', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '措施', dataIndex: 'measure' },
  ];
  return (
    <PageContainer title="院感日报">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey={(r: Row) => `${r.date}-${r.dept}`} columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无日报" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}