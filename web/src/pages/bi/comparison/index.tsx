/** 健澜科技 jlmedaios - 科室对比分析（M222 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Avatar, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface DeptRow { rank: number; dept: string; outpatient: number; discharge: number; avgStay: number; avgCost: number }
export default function BiComparisonPage() {
  usePageTitle('科室对比分析');
  const [list, setList] = useState<DeptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/bi/comparison').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.comparison ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<DeptRow> = [
    { title: '排名', dataIndex: 'rank', width: 70, render: (r: number) => r <= 3 ? <Avatar style={{ background: r === 1 ? '#faad14' : r === 2 ? '#8c8c8c' : '#d48806' }}>{r}</Avatar> : <Tag>{r}</Tag> },
    { title: '科室', dataIndex: 'dept' },
    { title: '门诊量', dataIndex: 'outpatient', sorter: (a, b) => a.outpatient - b.outpatient },
    { title: '出院人次', dataIndex: 'discharge', sorter: (a, b) => a.discharge - b.discharge },
    { title: '平均住院日', dataIndex: 'avgStay', render: (v: number) => `${v} 天` },
    { title: '平均费用', dataIndex: 'avgCost', sorter: (a, b) => a.avgCost - b.avgCost, render: (v: number) => <Tag color={v > 20000 ? 'red' : 'blue'}>¥{v.toLocaleString()}</Tag> },
  ];
  return (
    <PageContainer title="科室对比分析">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <Table<DeptRow> rowKey="rank" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无数据" /> }} pagination={false} />
        </Card>
      </Spin>
    </PageContainer>
  );
}
