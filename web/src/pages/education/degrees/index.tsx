/** 健澜科技 jlmedaios - 学位管理（M328 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; degree: string; major: string; grantDate: string; status: string }
export default function EducationDegreesPage() {
  usePageTitle('学位管理');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/education/degrees').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '姓名', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '学位', dataIndex: 'degree', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '专业', dataIndex: 'major' },
    { title: '授予时间', dataIndex: 'grantDate' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v.includes('已注册') ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="学位管理">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无学位" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}