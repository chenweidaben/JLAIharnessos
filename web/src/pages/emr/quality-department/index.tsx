/** 健澜科技 jlmedaios - 科室质控排名（M269 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { department: string; gradeA: string; defects: number; rectifyRate: string; rank: number }
export default function EmrQualityDepartmentPage() {
  usePageTitle('科室质控排名');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/emr/quality-department').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.depts ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '排名', dataIndex: 'rank', render: (v: number) => <Tag color={v <= 3 ? 'gold' : 'default'}>#{v}</Tag> },
    { title: '科室', dataIndex: 'department' },
    { title: '甲级率', dataIndex: 'gradeA', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '缺陷数', dataIndex: 'defects' },
    { title: '整改率', dataIndex: 'rectifyRate' },
  ];
  return (
    <PageContainer title="科室质控排名">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="department" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无排名" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
