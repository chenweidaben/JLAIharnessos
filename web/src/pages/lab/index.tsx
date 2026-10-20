/** 健澜科技 jlmedaios - 检验报告（M235 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; date: string; status: string; result: string }
export default function LabPage() {
  usePageTitle('检验报告');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/lab/reports').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.reports ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '报告号', dataIndex: 'id' },
    { title: '项目', dataIndex: 'name', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '日期', dataIndex: 'date' },
    { title: '结果', dataIndex: 'result' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已出' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="检验报告">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无报告" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
