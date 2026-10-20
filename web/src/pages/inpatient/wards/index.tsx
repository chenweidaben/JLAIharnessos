/** 健澜科技 jlmedaios - 住院病区（M284 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; bedCount: number; inHospital: number; emptyBeds: number; director: string }
export default function InpatientWardsPage() {
  usePageTitle('住院病区');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/inpatient/wards').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.wards ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '病区', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '总床位', dataIndex: 'bedCount' },
    { title: '在院', dataIndex: 'inHospital' },
    { title: '空床', dataIndex: 'emptyBeds', render: (v: number) => v <= 5 ? <Tag color="red">{v}</Tag> : v },
    { title: '主任', dataIndex: 'director' },
  ];
  return (
    <PageContainer title="住院病区">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无病区" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}