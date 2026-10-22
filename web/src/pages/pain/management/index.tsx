/**
 * 健澜科技 jlmedaios - 疼痛科管理（M817）
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
import { usePainWorkloadM817Store } from '@/store/painWorkloadM817Store';
import type { PainWorkload } from '@/services/api/painWorkloadM817';

const typeColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '疼痛类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: PainWorkload) => void): ColumnsType<PainWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊人次', dataIndex: 'outpatient', width: 100, align: 'right' },
  { title: '治疗人次', dataIndex: 'treatment', width: 100, align: 'right' },
  { title: '神经阻滞', dataIndex: 'nerveBlock', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '射频治疗', dataIndex: 'radiofrequency', width: 100, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function PainManagementM817Page() {
  usePageTitle('疼痛科管理');
  const { items, loading, error, demo, load } = usePainWorkloadM817Store();
  const [detail, setDetail] = useState<PainWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="疼痛科管理"
      description="日期 / 门诊人次 / 治疗人次 / 神经阻滞 / 射频治疗 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`疼痛工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="疼痛工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="门诊人次">{detail.outpatient}</Descriptions.Item>
              <Descriptions.Item label="治疗人次">{detail.treatment}</Descriptions.Item>
              <Descriptions.Item label="神经阻滞">{detail.nerveBlock}</Descriptions.Item>
              <Descriptions.Item label="射频治疗">{detail.radiofrequency}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="VAS 评分" span={2}>{detail.vas}</Descriptions.Item>
              <Descriptions.Item label="治疗记录" span={2}>{detail.records}</Descriptions.Item>
              <Descriptions.Item label="疗效评估" span={2}>{detail.outcome}</Descriptions.Item>
              <Descriptions.Item label="随访" span={2}>{detail.followup}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="疼痛类型分解">
              <Table rowKey="name" dataSource={detail.typeBreakdown} columns={typeColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
