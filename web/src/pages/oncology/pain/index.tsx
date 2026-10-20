/** 健澜科技 jlmedaios - 癌痛管理（M334 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; painScore: string; medication: string; effect: string; doctor: string }
export default function OncologyPainPage() {
  usePageTitle('癌痛管理');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/oncology/pain').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '疼痛评分', dataIndex: 'painScore', render: (v: string) => <Tag color={v.includes('NRS 6') || v.includes('NRS 7') || v.includes('NRS 8') ? 'red' : v.includes('中度') ? 'orange' : 'green'}>{v}</Tag> },
    { title: '用药', dataIndex: 'medication', ellipsis: true },
    { title: '镇痛效果', dataIndex: 'effect', render: (v: string) => <Tag color={v.includes('良好') || v.includes('NRS 2') || v.includes('NRS 1') ? 'green' : 'orange'}>{v}</Tag> },
    { title: '医生', dataIndex: 'doctor' },
  ];
  return (
    <PageContainer title="癌痛管理">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无癌痛记录" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}