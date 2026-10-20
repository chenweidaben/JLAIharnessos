/** 健澜科技 jlmedaios - 科室列表（M324 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { name: string; director: string; beds: number; staffCount: number; intro: string }
export default function HrDepartmentsPage() {
  usePageTitle('科室列表');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/hr/departments').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '科室', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '主任', dataIndex: 'director' },
    { title: '床位', dataIndex: 'beds', render: (v: number) => <Tag color="blue">{v}</Tag> },
    { title: '员工数', dataIndex: 'staffCount', render: (v: number) => <Tag color="green">{v}</Tag> },
    { title: '简介', dataIndex: 'intro', ellipsis: true },
  ];
  return (
    <PageContainer title="科室列表">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="name" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无科室" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}