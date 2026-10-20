/** 健澜科技 jlmedaios - 质控统计（M268 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { department: string; gradeA: string; gradeB: string; gradeC: string; defects: number; rank: number }
export default function EmrQualityStatsPage() {
  usePageTitle('质控统计');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/emr/quality-stats').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.stats ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '排名', dataIndex: 'rank', render: (v: number) => <Tag color={v === 1 ? 'gold' : 'default'}>#{v}</Tag> },
    { title: '科室', dataIndex: 'department' },
    { title: '甲级率', dataIndex: 'gradeA', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '乙级率', dataIndex: 'gradeB' },
    { title: '丙级率', dataIndex: 'gradeC', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '缺陷数', dataIndex: 'defects' },
  ];
  return (
    <PageContainer title="科室质控统计">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="department" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无统计" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
