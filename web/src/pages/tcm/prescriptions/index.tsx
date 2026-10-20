/** 健澜科技 jlmedaios - 中医处方（M311 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; formula: string; herbs: string; doctor: string; date: string; status: string }
export default function TcmPrescriptionsPage() {
  usePageTitle('中医处方');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/tcm/prescriptions').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.prescriptions ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '方剂', dataIndex: 'formula', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '组成', dataIndex: 'herbs' },
    { title: '医生', dataIndex: 'doctor' },
    { title: '日期', dataIndex: 'date' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已发药' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="中医处方">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无处方" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}