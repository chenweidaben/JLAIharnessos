/** 健澜科技 jlmedaios - 版本作者（M341 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; recordNo: string; author: string; title: string; department: string; contribution: string }
export default function EmrVersionAuthorPage() {
  usePageTitle('版本作者');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/emr/version-author').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '病案号', dataIndex: 'recordNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '作者', dataIndex: 'author', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '职称', dataIndex: 'title' },
    { title: '科室', dataIndex: 'department' },
    { title: '贡献', dataIndex: 'contribution', ellipsis: true },
  ];
  return (<PageContainer title="版本作者"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无作者" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}