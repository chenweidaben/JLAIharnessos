/** 健澜科技 jlmedaios - 禁忌症审查（M270 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; drug: string; type: string; patientCondition: string; severity: string; advice: string }
export default function CdsContraindicationPage() {
  usePageTitle('禁忌症审查');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/cds/contraindication').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.contraindications ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '药品', dataIndex: 'drug', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '类型', dataIndex: 'type', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '患者病情', dataIndex: 'patientCondition' },
    { title: '严重度', dataIndex: 'severity' },
    { title: '建议', dataIndex: 'advice' },
  ];
  return (
    <PageContainer title="禁忌症审查">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无数据" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
