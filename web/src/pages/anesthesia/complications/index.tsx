/** 健澜科技 jlmedaios - 麻醉并发症（M311 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; type: string; severity: string; treatment: string; time: string; status: string }
export default function AnesthesiaComplicationsPage() {
  usePageTitle('麻醉并发症');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/anesthesia/complications').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.complications ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '类型', dataIndex: 'type', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '严重度', dataIndex: 'severity', render: (v: string) => <Tag color={v === '重度' ? 'red' : v === '中度' ? 'orange' : 'green'}>{v}</Tag> },
    { title: '处理', dataIndex: 'treatment' },
    { title: '发生时间', dataIndex: 'time' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已处理' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="麻醉并发症">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无并发症" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}