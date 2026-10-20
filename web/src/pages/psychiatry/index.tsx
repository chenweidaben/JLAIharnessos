/** 健澜科技 jlmedaios - 精神科就诊（M240 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; diagnosis: string; scale: { SDS: number; SAS: number }; medication: string; risk: { selfHarm: string; suicide: string; impulse: string } }
export default function PsychiatryPage() {
  usePageTitle('精神科就诊');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/psychiatry/visits').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.visits ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '诊断', dataIndex: 'diagnosis', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '量表', dataIndex: 'scale', render: (v: Row['scale']) => <Tag color="blue">SDS {v.SDS} / SAS {v.SAS}</Tag> },
    { title: '用药', dataIndex: 'medication' },
    { title: '风险', dataIndex: 'risk', render: (v: Row['risk']) => <Tag color={v.suicide === '低' ? 'green' : 'red'}>自伤{v.selfHarm}/自杀{v.suicide}/冲动{v.impulse}</Tag> },
  ];
  return (
    <PageContainer title="精神科就诊">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无就诊" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
