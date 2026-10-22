/**
 * 健澜科技 jlmedaios - 人力资源管理（M893）
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
import { useHrWorkloadM893Store } from '@/store/hrWorkloadM893Store';
import type { HrWorkload } from '@/services/api/hrWorkloadM893';

const simpleColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '项目', dataIndex: 'name' },
  { title: '人数', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: HrWorkload) => void): ColumnsType<HrWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '在岗人数', dataIndex: 'onDuty', width: 110, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '招聘需求数', dataIndex: 'openPositions', width: 120, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  { title: '培训人次', dataIndex: 'trainingVisits', width: 110, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '绩效考核数', dataIndex: 'performanceReviews', width: 120, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  {
    title: '离职人数',
    dataIndex: 'resignations',
    width: 110,
    align: 'right',
    render: (v: number) => <Tag color={v === 0 ? 'green' : 'red'}>{v}</Tag>,
  },
  { title: '状态', dataIndex: 'status', width: 110 },
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

export default function HrManagementM893Page() {
  usePageTitle('人力资源管理');
  const { items, loading, error, demo, load } = useHrWorkloadM893Store();
  const [detail, setDetail] = useState<HrWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="人力资源管理"
      description="日期 / 在岗 / 招聘需求 / 培训人次 / 绩效考核 / 离职 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`HR 工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="HR 工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="在岗人数">{detail.onDuty}</Descriptions.Item>
              <Descriptions.Item label="招聘需求数">{detail.openPositions}</Descriptions.Item>
              <Descriptions.Item label="培训人次">{detail.trainingVisits}</Descriptions.Item>
              <Descriptions.Item label="绩效考核数">{detail.performanceReviews}</Descriptions.Item>
              <Descriptions.Item label="离职人数">{detail.resignations}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="招聘进度" span={2}>{detail.recruitment}</Descriptions.Item>
              <Descriptions.Item label="培训记录" span={2}>{detail.trainingRecord}</Descriptions.Item>
              <Descriptions.Item label="绩效考核结果" span={2}>{detail.performance}</Descriptions.Item>
              <Descriptions.Item label="离职分析" span={2}>{detail.turnoverAnalysis}</Descriptions.Item>
            </Descriptions>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card size="small" title="人员结构（医师/护士/技师/行政）">
                <Table rowKey="name" dataSource={detail.staffBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
              <Card size="small" title="职称分布（正高/副高/中级/初级）">
                <Table rowKey="name" dataSource={detail.titleBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
            </div>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
