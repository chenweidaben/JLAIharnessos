/** 健澜科技 jlmedaios - 智能排队（M305 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; dept: string; window: string; currentNo: string; myNo: string; waitingCount: number; estimatedWait: number }
export default function SmartServiceQueuePage() {
  usePageTitle('智能排队');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/smart-service/queue').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.queues ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '诊室', dataIndex: 'window' },
    { title: '当前号', dataIndex: 'currentNo', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '我的号', dataIndex: 'myNo' },
    { title: '等待数', dataIndex: 'waitingCount' },
    { title: '预估(分)', dataIndex: 'estimatedWait', render: (v: number) => v > 30 ? <Tag color="red">{v}</Tag> : v },
  ];
  return (
    <PageContainer title="智能排队">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无排队" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}