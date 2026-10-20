/** 健澜科技 jlmedaios - 实习生管理（M243 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; school: string; major: string; rotationDept: string; mentor: string; status: string }
export default function EducationInternsPage() {
  usePageTitle('实习生管理');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/education/interns').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.interns ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '姓名', dataIndex: 'name' },
    { title: '学校', dataIndex: 'school' },
    { title: '专业', dataIndex: 'major', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '轮转科室', dataIndex: 'rotationDept' },
    { title: '带教老师', dataIndex: 'mentor' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '在科' ? 'green' : 'default'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="实习生管理">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无实习生" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
