/** 健澜科技 jlmedaios - 救护车调度（M333 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; ambulanceNo: string; mission: string; departTime: string; arriveTime: string; status: string }
export default function EmergencyAmbulancePage() {
  usePageTitle('救护车调度');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/emergency/ambulance').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '车牌号', dataIndex: 'ambulanceNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '任务', dataIndex: 'mission' },
    { title: '出车时间', dataIndex: 'departTime', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '到达时间', dataIndex: 'arriveTime' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已完成' ? 'green' : v === '执行中' ? 'blue' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="救护车调度">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无调度记录" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}