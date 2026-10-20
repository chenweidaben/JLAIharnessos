/** 健澜科技 jlmedaios - 病理管理（M234 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; specimenType: string; diagnosis: string; pathologist: string; status: string }
export default function PathologyPage() {
  usePageTitle('病理管理');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/pathology/reports').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.reports ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '标本类型', dataIndex: 'specimenType', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '诊断', dataIndex: 'diagnosis' },
    { title: '病理医生', dataIndex: 'pathologist' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已出' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="病理管理（报告）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无病理报告" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
