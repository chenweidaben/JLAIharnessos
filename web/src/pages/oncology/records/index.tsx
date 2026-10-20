/** 健澜科技 jlmedaios - 肿瘤记录（M312 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; diagnosis: string; stage: string; treatment: string; oncologist: string; startDate: string; status: string }
export default function OncologyRecordsPage() {
  usePageTitle('肿瘤记录');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/oncology/records').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.records ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '诊断', dataIndex: 'diagnosis', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '分期', dataIndex: 'stage', render: (v: string) => <Tag color="orange">{v}</Tag> },
    { title: '治疗方案', dataIndex: 'treatment' },
    { title: '主治医生', dataIndex: 'oncologist' },
    { title: '开始日期', dataIndex: 'startDate' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '治疗中' ? 'blue' : v === '已完成' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="肿瘤记录">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无肿瘤记录" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}