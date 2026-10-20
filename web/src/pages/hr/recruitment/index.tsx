/** 健澜科技 jlmedaios - 招聘管理（M355 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; positionName: string; department: string; headcount: string; status: string; publishTime: string }
export default function HrRecruitmentPage() {
  usePageTitle('招聘管理');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/hr/recruitment').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '岗位名', dataIndex: 'positionName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '科室', dataIndex: 'department' },
    { title: '人数', dataIndex: 'headcount' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v.includes('招聘中') ? 'blue' : v.includes('已完成') ? 'green' : 'orange'}>{v}</Tag> },
    { title: '发布时间', dataIndex: 'publishTime' },
  ];
  return (<PageContainer title="招聘管理"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无招聘" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}