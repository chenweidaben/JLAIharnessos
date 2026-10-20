/** 健澜科技 jlmedaios - 考勤记录（M294 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; dept: string; present: number; leave: number; businessTrip: number; late: number; earlyLeave: number }
export default function HrAttendancePage() {
  usePageTitle('考勤记录');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/hr/attendance').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.attendance ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '出勤', dataIndex: 'present', render: (v: number) => <Tag color="green">{v}</Tag> },
    { title: '请假', dataIndex: 'leave' },
    { title: '出差', dataIndex: 'businessTrip' },
    { title: '迟到', dataIndex: 'late', render: (v: number) => v > 0 ? <Tag color="orange">{v}</Tag> : v },
    { title: '早退', dataIndex: 'earlyLeave' },
  ];
  return (
    <PageContainer title="考勤记录">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无考勤" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
