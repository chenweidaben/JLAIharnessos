/** 健澜科技 jlmedaios - 教学培训（M279 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id?: string; name: string; dept: string; lecturer: string; time: string; attendees: number; passRate: string }
export default function EducationTrainingsPage() {
  usePageTitle('教学培训');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/education/trainings').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.trainings ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '培训', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '范围', dataIndex: 'dept' },
    { title: '讲师', dataIndex: 'lecturer' },
    { title: '时间', dataIndex: 'time' },
    { title: '参与人数', dataIndex: 'attendees' },
    { title: '通过率', dataIndex: 'passRate', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (
    <PageContainer title="教学培训">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="name" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无培训" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
