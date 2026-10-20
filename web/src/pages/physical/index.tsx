/** 健澜科技 jlmedaios - 体检管理（M234 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; package: string; date: string; status: string }
export default function PhysicalPage() {
  usePageTitle('体检管理');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/physical/exams').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.exams ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '姓名', dataIndex: 'name' },
    { title: '套餐', dataIndex: 'package', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '日期', dataIndex: 'date' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已完成' ? 'green' : v === '已预约' ? 'orange' : 'default'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="体检管理（预约）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无体检预约" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
