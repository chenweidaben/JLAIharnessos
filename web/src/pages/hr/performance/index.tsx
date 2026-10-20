/** 健澜科技 jlmedaios - 绩效考核（M294 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; dept: string; year: number; grade: string; score: number; reward: string }
export default function HrPerformancePage() {
  usePageTitle('绩效考核');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/hr/performance').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.performance ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '姓名', dataIndex: 'name' },
    { title: '科室', dataIndex: 'dept' },
    { title: '年度', dataIndex: 'year' },
    { title: '等级', dataIndex: 'grade', render: (v: string) => <Tag color={v === '优秀' ? 'gold' : v === '良好' ? 'green' : 'blue'}>{v}</Tag> },
    { title: '得分', dataIndex: 'score' },
    { title: '奖励', dataIndex: 'reward' },
  ];
  return (
    <PageContainer title="绩效考核">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无绩效" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}