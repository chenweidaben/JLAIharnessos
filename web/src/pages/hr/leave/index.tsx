/** 健澜科技 jlmedaios - 请假记录（M324 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { employee: string; type: string; days: number; time: string; status: string }
export default function HrLeavePage() {
  usePageTitle('请假记录');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/hr/leave').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '员工', dataIndex: 'employee', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '类型', dataIndex: 'type', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '天数', dataIndex: 'days', render: (v: number) => <Tag color="orange">{v} 天</Tag> },
    { title: '时间', dataIndex: 'time' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已批准' ? 'green' : v === '待审批' ? 'orange' : 'blue'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="请假记录">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey={(r: Row) => `${r.employee}-${r.time}`} columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无请假" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}