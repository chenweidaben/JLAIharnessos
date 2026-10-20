/** 健澜科技 jlmedaios - 移动护理查房（M276 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; task: string; nurse: string; time: string; status: string }
export default function MobileNursingRoundsPage() {
  usePageTitle('移动护理查房');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/mobile/nursing-rounds').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.rounds ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '任务', dataIndex: 'task', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '责任护士', dataIndex: 'nurse' },
    { title: '时间', dataIndex: 'time' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已完成' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="移动护理查房">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无查房" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
