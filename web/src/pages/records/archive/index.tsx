/** 健澜科技 jlmedaios - 病历归档（M303 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; recordNo: string; patient: string; archiveTime: string; archiveRoom: string; status: string }
export default function RecordsArchivePage() {
  usePageTitle('病历归档');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/records/archive').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.records ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '病案号', dataIndex: 'recordNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '患者', dataIndex: 'patient' },
    { title: '归档时间', dataIndex: 'archiveTime' },
    { title: '归档位置', dataIndex: 'archiveRoom' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已归档' ? 'green' : v === '待归档' ? 'orange' : 'red'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="病历归档">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无归档" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}