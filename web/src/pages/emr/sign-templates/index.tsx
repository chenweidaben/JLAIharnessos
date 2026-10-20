/** 健澜科技 jlmedaios - 签名模板（M369 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; templateName: string; type: string; content: string; status: string; updateTime: string }
export default function EmrSignTemplatesPage() {
  usePageTitle('签名模板');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/emr/sign-templates').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '模板名', dataIndex: 'templateName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '类型', dataIndex: 'type', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '内容', dataIndex: 'content', ellipsis: true },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '更新时间', dataIndex: 'updateTime' },
  ];
  return (<PageContainer title="签名模板"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无模板" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}