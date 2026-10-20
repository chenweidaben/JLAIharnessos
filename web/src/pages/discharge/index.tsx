/** 健澜科技 jlmedaios - 出院小结（M236 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; admissionDiag: string; dischargeDiag: string; outcome: string; instructions: string; followUp: string }
export default function DischargePage() {
  usePageTitle('出院小结');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/discharge/summaries').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.summaries ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '入院诊断', dataIndex: 'admissionDiag' },
    { title: '出院诊断', dataIndex: 'dischargeDiag', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '转归', dataIndex: 'outcome', render: (v: string) => <Tag color={v === '好转' ? 'green' : v === '治愈' ? 'blue' : 'orange'}>{v}</Tag> },
    { title: '出院医嘱', dataIndex: 'instructions' },
    { title: '随访', dataIndex: 'followUp' },
  ];
  return (
    <PageContainer title="出院小结">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无小结" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
