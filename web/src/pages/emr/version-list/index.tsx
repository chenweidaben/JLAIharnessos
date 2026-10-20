/** 健澜科技 jlmedaios - 病历版本列表（M341 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; recordNo: string; version: string; author: string; time: string; status: string }
export default function EmrVersionListPage() {
  usePageTitle('病历版本列表');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/emr/version-list').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '病案号', dataIndex: 'recordNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '版本', dataIndex: 'version', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '作者', dataIndex: 'author' },
    { title: '时间', dataIndex: 'time' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v.includes('已审核') ? 'green' : v.includes('草稿') ? 'orange' : 'blue'}>{v}</Tag> },
  ];
  return (<PageContainer title="病历版本列表"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无版本" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}