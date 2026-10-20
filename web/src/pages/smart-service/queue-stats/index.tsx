/** 健澜科技 jlmedaios - 排队统计（M322 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { window: string; queueCount: number; avgWait: string; callSpeed: string; status: string }
export default function SmartServiceQueueStatsPage() {
  usePageTitle('排队统计');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/smart-service/queue-stats').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '窗口', dataIndex: 'window', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '排队', dataIndex: 'queueCount', render: (v: number) => <Tag color={v > 20 ? 'red' : v > 10 ? 'orange' : 'green'}>{v} 人</Tag> },
    { title: '平均等待', dataIndex: 'avgWait', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '叫号速度', dataIndex: 'callSpeed' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '正常' ? 'green' : v === '拥堵' ? 'red' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="排队统计">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="window" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无数据" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}