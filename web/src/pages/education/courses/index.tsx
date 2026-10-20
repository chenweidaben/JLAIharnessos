/** 健澜科技 jlmedaios - 课程列表（M328 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; lecturer: string; hours: number; credits: number; enrolled: number }
export default function EducationCoursesPage() {
  usePageTitle('课程列表');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/education/courses').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.courses ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '课程名', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '讲师', dataIndex: 'lecturer' },
    { title: '学时', dataIndex: 'hours', render: (v: number) => <Tag color="blue">{v}</Tag> },
    { title: '学分', dataIndex: 'credits', render: (v: number) => <Tag color="green">{v}</Tag> },
    { title: '选课人数', dataIndex: 'enrolled', render: (v: number) => <Tag color="orange">{v}</Tag> },
  ];
  return (
    <PageContainer title="课程列表">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无课程" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}