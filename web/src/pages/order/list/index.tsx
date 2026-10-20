/** 健澜科技 jlmedaios - 医嘱列表（M302 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; orderNo: string; patient: string; item: string; doctor: string; status: string }
export default function OrderListPage() {
  usePageTitle('医嘱列表');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/order/list').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.orders ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '医嘱号', dataIndex: 'orderNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '患者', dataIndex: 'patient' },
    { title: '项目', dataIndex: 'item' },
    { title: '医生', dataIndex: 'doctor' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '执行中' ? 'blue' : v === '已停止' ? 'orange' : 'green'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="医嘱列表">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无医嘱" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}