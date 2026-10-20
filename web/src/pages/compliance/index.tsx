/** 健澜科技 jlmedaios - 合规记录（M246 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; type: string; agency: string; date: string; issues: string; rectification: string; result: string }
export default function CompliancePage() {
  usePageTitle('合规记录');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/compliance/records').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.records ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '检查类型', dataIndex: 'type', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '检查机构', dataIndex: 'agency' },
    { title: '检查日期', dataIndex: 'date' },
    { title: '主要问题', dataIndex: 'issues' },
    { title: '整改状态', dataIndex: 'rectification', render: (v: string) => <Tag color={v === '已完成' ? 'green' : v === '整改中' ? 'orange' : 'default'}>{v}</Tag> },
    { title: '处理结果', dataIndex: 'result' },
  ];
  return (
    <PageContainer title="合规检查记录">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无记录" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
