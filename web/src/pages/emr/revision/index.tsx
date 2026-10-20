/** 健澜科技 jlmedaios - 病历修订记录（M266 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; mrn: string; version: string; reviser: string; content: string; approval: string }
export default function EmrRevisionPage() {
  usePageTitle('病历修订记录');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/emr/revision').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.revisions ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '病历号', dataIndex: 'mrn' },
    { title: '版本', dataIndex: 'version', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '修订人', dataIndex: 'reviser' },
    { title: '修订内容', dataIndex: 'content' },
    { title: '审批', dataIndex: 'approval', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (
    <PageContainer title="病历修订记录">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无修订" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
