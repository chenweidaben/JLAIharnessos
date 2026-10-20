/** 健澜科技 jlmedaios - 影像报告（M235 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; modality: string; bodyPart: string; date: string; status: string; impression: string }
export default function PacsPage() {
  usePageTitle('影像报告');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/pacs/reports').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.reports ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '检查号', dataIndex: 'id' },
    { title: '设备', dataIndex: 'modality', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '部位', dataIndex: 'bodyPart' },
    { title: '日期', dataIndex: 'date' },
    { title: '印象', dataIndex: 'impression' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已出' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="影像报告（PACS）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无报告" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
