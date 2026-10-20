/** 健澜科技 jlmedaios - 精神科评估（M283 DEMO） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; scale: string; score: number; risk: string; doctor: string }
const DEMO: Row[] = [
  { id: 'PSY-001', patient: '郑演示', scale: 'PHQ-9（抑郁）', score: 12, risk: '中度', doctor: '精神科-冯医生' },
  { id: 'PSY-002', patient: '陈演示', scale: 'GAD-7（焦虑）', score: 4, risk: '正常', doctor: '精神科-冯医生' },
];
export default function PsychiatryAssessmentsPage() {
  usePageTitle('精神科评估');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    setTimeout(() => { if (alive) setList(DEMO); setLoading(false); }, 200);
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '量表', dataIndex: 'scale', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '得分', dataIndex: 'score' },
    { title: '风险等级', dataIndex: 'risk', render: (v: string) => <Tag color={v === '正常' ? 'green' : v === '中度' ? 'orange' : 'red'}>{v}</Tag> },
    { title: '医生', dataIndex: 'doctor' },
  ];
  return (
    <PageContainer title="精神科评估">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无评估" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
