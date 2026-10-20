/** 健澜科技 jlmedaios - 设备维护（M279 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id?: string; equipment: string; fault: string; technician: string; cost: number; status: string }
export default function EquipmentMaintenancePage() {
  usePageTitle('设备维护');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/equipment/maintenance').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.records ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '设备', dataIndex: 'equipment', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '故障', dataIndex: 'fault' },
    { title: '工程师', dataIndex: 'technician' },
    { title: '费用(元)', dataIndex: 'cost' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已修复' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="设备维护记录">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="equipment" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无记录" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
