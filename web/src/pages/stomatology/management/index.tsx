/**
 * 健澜科技 jlmedaios - 口腔科管理（M824）
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
import { useStomatologyWorkloadM824Store } from '@/store/stomatologyWorkloadM824Store';
import type { StomatologyWorkload } from '@/services/api/stomatologyWorkloadM824';

const treatmentColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '治疗类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: StomatologyWorkload) => void): ColumnsType<StomatologyWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊人次', dataIndex: 'outpatient', width: 100, align: 'right' },
  { title: '补牙数', dataIndex: 'fillings', width: 90, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '拔牙数', dataIndex: 'extractions', width: 90, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  { title: '根管治疗数', dataIndex: 'rootCanal', width: 120, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function StomatologyManagementM824Page() {
  usePageTitle('口腔科管理');
  const { items, loading, error, demo, load } = useStomatologyWorkloadM824Store();
  const [detail, setDetail] = useState<StomatologyWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="口腔科管理"
      description="日期 / 门诊人次 / 补牙数 / 拔牙数 / 根管治疗数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`口腔科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="口腔科工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="门诊人次">{detail.outpatient}</Descriptions.Item>
              <Descriptions.Item label="补牙数">{detail.fillings}</Descriptions.Item>
              <Descriptions.Item label="拔牙数">{detail.extractions}</Descriptions.Item>
              <Descriptions.Item label="根管治疗数">{detail.rootCanal}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="牙周检查" span={2}>{detail.periodontal}</Descriptions.Item>
              <Descriptions.Item label="口腔影像" span={2}>{detail.imaging}</Descriptions.Item>
              <Descriptions.Item label="义齿修复" span={2}>{detail.prosthesis}</Descriptions.Item>
              <Descriptions.Item label="随访" span={2}>{detail.followup}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="治疗类型分解">
              <Table rowKey="name" dataSource={detail.treatmentBreakdown} columns={treatmentColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
