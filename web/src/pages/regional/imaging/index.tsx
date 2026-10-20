/** 健澜科技 jlmedaios - 区域影像协同（M246 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; type: string; uploadStatus: string; radiologist: string; uploadTime: string }
export default function RegionalImagingPage() {
  usePageTitle('区域影像协同');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/regional/imaging').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.images ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '检查类型', dataIndex: 'type', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '上传状态', dataIndex: 'uploadStatus', render: (v: string) => <Tag color={v === '已出报告' ? 'green' : 'orange'}>{v}</Tag> },
    { title: '远程放射医生', dataIndex: 'radiologist' },
    { title: '上传时间', dataIndex: 'uploadTime' },
  ];
  return (
    <PageContainer title="区域影像协同（远程会诊）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无记录" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
