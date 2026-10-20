/** 健澜科技 jlmedaios - 抗肿瘤治疗（M334 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; treatmentType: string; course: string; efficacy: string; doctor: string }
export default function OncologyTreatmentsPage() {
  usePageTitle('抗肿瘤治疗');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/oncology/treatments').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '治疗类型', dataIndex: 'treatmentType', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '疗程', dataIndex: 'course', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '疗效', dataIndex: 'efficiency', render: (_: string, r: Row) => <Tag color={r.efficacy.includes('PR') || r.efficacy.includes('CR') ? 'green' : r.efficacy.includes('SD') ? 'blue' : 'orange'}>{r.efficacy}</Tag> },
    { title: '医生', dataIndex: 'doctor' },
  ];
  return (
    <PageContainer title="抗肿瘤治疗">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无治疗记录" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}