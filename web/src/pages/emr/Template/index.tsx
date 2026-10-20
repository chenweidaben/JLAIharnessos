/** 健澜科技 jlmedaios - 病历模板（M307 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; dept: string; version: string; updatedAt: string; usageCount: number }
export default function EmrTemplatePage() {
  usePageTitle('病历模板');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/emr/template').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.templates ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '模板名', dataIndex: 'name' },
    { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '版本', dataIndex: 'version', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '更新时间', dataIndex: 'updatedAt' },
    { title: '使用次数', dataIndex: 'usageCount' },
  ];
  return (
    <PageContainer title="病历模板">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无模板" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}