/** 健澜科技 jlmedaios - 发热门诊（M284 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; temperature: string; diagnosis: string; triageLevel: string; status: string }
export default function FeverClinicsPage() {
  usePageTitle('发热门诊');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/fever/clinics').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.patients ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '体温', dataIndex: 'temperature', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '诊断', dataIndex: 'diagnosis' },
    { title: '分诊', dataIndex: 'triageLevel', render: (v: string) => <Tag color="orange">{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已离院' ? 'green' : 'blue'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="发热门诊">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无患者" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}