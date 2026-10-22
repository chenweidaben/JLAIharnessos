/**
 * 健澜科技 jlmedaios - 康复科管理（M816）
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
import { useRehabilitationWorkloadM816Store } from '@/store/rehabilitationWorkloadM816Store';
import type { RehabilitationWorkload } from '@/services/api/rehabilitationWorkloadM816';

const typeColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '治疗类型', dataIndex: 'name' },
  { title: '人次', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: RehabilitationWorkload) => void): ColumnsType<RehabilitationWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '治疗人次', dataIndex: 'sessions', width: 100, align: 'right' },
  { title: '物理治疗', dataIndex: 'pt', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '作业治疗', dataIndex: 'ot', width: 100, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '言语治疗', dataIndex: 'st', width: 100, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
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

export default function RehabilitationManagementM816Page() {
  usePageTitle('康复科管理');
  const { items, loading, error, demo, load } = useRehabilitationWorkloadM816Store();
  const [detail, setDetail] = useState<RehabilitationWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="康复科管理"
      description="日期 / 治疗人次 / 物理治疗 / 作业治疗 / 言语治疗 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`康复工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="康复工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="治疗人次">{detail.sessions}</Descriptions.Item>
              <Descriptions.Item label="物理治疗">{detail.pt}</Descriptions.Item>
              <Descriptions.Item label="作业治疗">{detail.ot}</Descriptions.Item>
              <Descriptions.Item label="言语治疗">{detail.st}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="患者功能评估（FIM/Barthel）" span={2}>{detail.functional}</Descriptions.Item>
              <Descriptions.Item label="治疗计划" span={2}>{detail.plan}</Descriptions.Item>
              <Descriptions.Item label="疗效评估" span={2}>{detail.outcome}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="治疗类型分解">
              <Table rowKey="name" dataSource={detail.typeBreakdown} columns={typeColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
