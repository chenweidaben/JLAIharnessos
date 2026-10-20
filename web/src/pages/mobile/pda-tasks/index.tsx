/** 健澜科技 jlmedaios - PDA任务（M304 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; taskType: string; patient: string; bed: string; item: string; execTime: string }
export default function MobilePdaTasksPage() {
  usePageTitle('PDA 任务');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/mobile/pda-tasks').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.tasks ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '任务类型', dataIndex: 'taskType', render: (v: string) => <Tag color={v === '输液' ? 'blue' : v === '口服药' ? 'green' : 'purple'}>{v}</Tag> },
    { title: '患者', dataIndex: 'patient' },
    { title: '床号', dataIndex: 'bed' },
    { title: '项目', dataIndex: 'item' },
    { title: '执行时间', dataIndex: 'execTime' },
  ];
  return (
    <PageContainer title="PDA 任务">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无任务" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}