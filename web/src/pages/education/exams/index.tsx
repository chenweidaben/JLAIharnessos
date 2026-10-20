/** 健澜科技 jlmedaios - 考试记录（M328 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; subject: string; participants: number; avgScore: number; passRate: number }
export default function EducationExamsPage() {
  usePageTitle('考试记录');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/education/exams').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.exams ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '考试名', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '科目', dataIndex: 'subject' },
    { title: '人数', dataIndex: 'participants' },
    { title: '平均分', dataIndex: 'avgScore', render: (v: number) => <Tag color="blue">{v}</Tag> },
    { title: '通过率', dataIndex: 'passRate', render: (v: number) => <Tag color={v >= 90 ? 'green' : v >= 70 ? 'orange' : 'red'}>{v}%</Tag> },
  ];
  return (
    <PageContainer title="考试记录">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无考试" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}