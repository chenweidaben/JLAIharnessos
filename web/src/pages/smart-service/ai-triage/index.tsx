/** 健澜科技 jlmedaios - AI 分诊（M322 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; chiefComplaint: string; suggestedDept: string; urgency: string; confidence: string }
export default function SmartServiceAiTriagePage() {
  usePageTitle('AI 分诊');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/smart-service/ai-triage').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '主诉', dataIndex: 'chiefComplaint', ellipsis: true },
    { title: '建议科室', dataIndex: 'suggestedDept', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '紧急度', dataIndex: 'urgency', render: (v: string) => <Tag color={v.startsWith('I') ? 'red' : v.startsWith('II') ? 'orange' : 'blue'}>{v}</Tag> },
    { title: '置信度', dataIndex: 'confidence', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (
    <PageContainer title="AI 分诊">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无分诊" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}