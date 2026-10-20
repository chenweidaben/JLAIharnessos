/** 健澜科技 jlmedaios - 床位使用率（M275 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { department: string; totalBeds: number; inHospital: number; occupancyRate: string; emptyBeds: number }
export default function BiBedOccupancyPage() {
  usePageTitle('床位使用率');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/bi/bed-occupancy').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.occupancy ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '科室', dataIndex: 'department' },
    { title: '总床位数', dataIndex: 'totalBeds' },
    { title: '在院', dataIndex: 'inHospital' },
    { title: '使用率', dataIndex: 'occupancyRate', render: (v: string) => <Tag color={parseInt(v) >= 95 ? 'red' : 'green'}>{v}</Tag> },
    { title: '空床', dataIndex: 'emptyBeds' },
  ];
  return (
    <PageContainer title="床位使用率">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="department" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无数据" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
