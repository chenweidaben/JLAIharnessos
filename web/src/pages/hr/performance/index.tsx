/**
 * 健澜科技 jlmedaios - 绩效考核管理（M735，升级自 M294 简易页）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Modal,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePerformanceM735Store } from '@/store/performanceM735Store';
import {
  PERF_GRADE_META,
  PERF_STATUS_META,
  type PerformanceRecord,
} from '@/services/api/performanceM735';

const indColumns: ColumnsType<{ name: string; weight: number; score: number }> = [
  { title: '考核指标', dataIndex: 'name' },
  { title: '权重(%)', dataIndex: 'weight', align: 'right' },
  { title: '得分', dataIndex: 'score', align: 'right' },
];

const buildColumns = (setDetail: (r: PerformanceRecord) => void): ColumnsType<PerformanceRecord> => [
  { title: '员工姓名', dataIndex: 'employee', width: 110 },
  { title: '科室', dataIndex: 'dept', width: 140 },
  { title: '考核周期', dataIndex: 'period', width: 110 },
  { title: '考核得分', dataIndex: 'score', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  {
    title: '等级',
    dataIndex: 'grade',
    width: 130,
    render: (v: PerformanceRecord['grade']) => <Tag color={PERF_GRADE_META[v].color}>{PERF_GRADE_META[v].label}</Tag>,
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: PerformanceRecord['status']) => <Tag color={PERF_STATUS_META[v].color}>{PERF_STATUS_META[v].label}</Tag>,
  },
  {
    title: '操作',
    width: 90,
    render: (_v, row) => (
      <Button type="link" size="small" onClick={() => setDetail(row)}>
        详情
      </Button>
    ),
  },
];

export default function HrPerformancePage() {
  usePageTitle('绩效考核管理');
  const { items, loading, error, demo, load } = usePerformanceM735Store();
  const [detail, setDetail] = useState<PerformanceRecord | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="绩效考核管理"
      description="员工姓名 / 科室 / 考核周期 / 考核得分 / 等级 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`绩效考核（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="绩效考核详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="员工姓名">{detail.employee}</Descriptions.Item>
              <Descriptions.Item label="科室">{detail.dept}</Descriptions.Item>
              <Descriptions.Item label="考核周期">{detail.period}</Descriptions.Item>
              <Descriptions.Item label="考核得分">{detail.score}</Descriptions.Item>
              <Descriptions.Item label="绩效等级">
                <Tag color={PERF_GRADE_META[detail.grade].color}>{PERF_GRADE_META[detail.grade].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={PERF_STATUS_META[detail.status].color}>{PERF_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="考核指标分解" style={{ marginBottom: 16 }}>
              <Table rowKey="name" dataSource={detail.indicators} columns={indColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="扣分原因">{detail.deductions}</Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
