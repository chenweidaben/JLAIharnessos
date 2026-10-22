/**
 * 健澜科技 jlmedaios - 教学管理（M890）
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
import { useTeachingWorkloadM890Store } from '@/store/teachingWorkloadM890Store';
import type { TeachingWorkload } from '@/services/api/teachingWorkloadM890';

const simpleColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '项目', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: TeachingWorkload) => void): ColumnsType<TeachingWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '实习医生数', dataIndex: 'medInterns', width: 130, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '实习护士数', dataIndex: 'nursingInterns', width: 130, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '规培医生数', dataIndex: 'residents', width: 130, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '进修医生数', dataIndex: 'fellows', width: 120, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '教学查房数', dataIndex: 'teachingRounds', width: 120, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
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

export default function TeachingManagementM890Page() {
  usePageTitle('教学管理');
  const { items, loading, error, demo, load } = useTeachingWorkloadM890Store();
  const [detail, setDetail] = useState<TeachingWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="教学管理"
      description="日期 / 实习医生 / 实习护士 / 规培医生 / 进修医生 / 教学查房 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`教学工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1500 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="教学工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="实习医生数">{detail.medInterns}</Descriptions.Item>
              <Descriptions.Item label="实习护士数">{detail.nursingInterns}</Descriptions.Item>
              <Descriptions.Item label="规培医生数">{detail.residents}</Descriptions.Item>
              <Descriptions.Item label="进修医生数">{detail.fellows}</Descriptions.Item>
              <Descriptions.Item label="教学查房数">{detail.teachingRounds}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="考核成绩（出科/年度/OSCE）" span={2}>{detail.examResults}</Descriptions.Item>
              <Descriptions.Item label="教学质量评价" span={2}>{detail.qualityEvaluation}</Descriptions.Item>
            </Descriptions>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card size="small" title="学员分类（临床/护理/规培/进修）">
                <Table rowKey="name" dataSource={detail.traineeBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
              <Card size="small" title="教学活动（查房/小讲课/病例讨论/操作）">
                <Table rowKey="name" dataSource={detail.activityBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
            </div>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
