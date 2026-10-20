/** 健澜科技 jlmedaios - 移动生命体征（M305 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; temp: number; pulse: number; resp: number; bp: string; spo2: number; recorder: string }
export default function MobileVitalsPage() {
  usePageTitle('移动生命体征');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/mobile/vitals').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.vitals ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '体温℃', dataIndex: 'temp', render: (v: number) => v >= 37.3 ? <Tag color="red">{v}</Tag> : v },
    { title: '脉搏', dataIndex: 'pulse' },
    { title: '呼吸', dataIndex: 'resp' },
    { title: '血压', dataIndex: 'bp', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'SpO2', dataIndex: 'spo2', render: (v: number) => v < 95 ? <Tag color="red">{v}%</Tag> : `${v}%` },
    { title: '录入', dataIndex: 'recorder' },
  ];
  return (
    <PageContainer title="移动生命体征">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无体征" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}