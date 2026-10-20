/** 健澜科技 jlmedaios - ICU 患者（M241 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; bedNo: string; patient: string; diagnosis: string; apache2: number; rass: number; admitTime: string }
export default function IcuPage() {
  usePageTitle('ICU 患者');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/icu/patients').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.patients ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '床号', dataIndex: 'bedNo', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '患者', dataIndex: 'patient' },
    { title: '诊断', dataIndex: 'diagnosis' },
    { title: 'APACHE II', dataIndex: 'apache2', render: (v: number) => <Tag color={v >= 20 ? 'red' : v >= 15 ? 'orange' : 'green'}>{v}</Tag> },
    { title: 'RASS', dataIndex: 'rass', render: (v: number) => <Tag color="blue">{v}</Tag> },
    { title: '入室时间', dataIndex: 'admitTime' },
  ];
  return (
    <PageContainer title="ICU 重症患者">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无患者" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
