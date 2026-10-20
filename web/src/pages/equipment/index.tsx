/** 健澜科技 jlmedaios - 设备管理（M234 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { name: string; model: string; code: string; dept: string; purchaseDate: string; value: number; status: string }
export default function EquipmentPage() {
  usePageTitle('设备管理');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/equipment/assets').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.assets ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '设备名称', dataIndex: 'name' },
    { title: '型号', dataIndex: 'model' },
    { title: '编号', dataIndex: 'code' },
    { title: '科室', dataIndex: 'dept' },
    { title: '购入日期', dataIndex: 'purchaseDate' },
    { title: '原值(万)', dataIndex: 'value', render: (v: number) => <Tag color="gold">{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '在用' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="设备管理（台账）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="code" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无设备" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
