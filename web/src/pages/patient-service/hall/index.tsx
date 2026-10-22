/**
 * 健澜科技 jlmedaios - 门诊大厅管理（M900）
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
import { useOutpatientHallWorkloadM900Store } from '@/store/outpatientHallWorkloadM900Store';
import type { OutpatientHallWorkload } from '@/services/api/outpatientHallWorkloadM900';

const buildColumns = (setDetail: (r: OutpatientHallWorkload) => void): ColumnsType<OutpatientHallWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊人次', dataIndex: 'visits', width: 110, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '挂号人次', dataIndex: 'registered', width: 110, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '候诊人数', dataIndex: 'waiting', width: 110, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  { title: '收费人次', dataIndex: 'billed', width: 110, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '取药人次', dataIndex: 'dispensed', width: 110, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function OutpatientHallM900Page() {
  usePageTitle('门诊大厅管理');
  const { items, loading, error, demo, load } = useOutpatientHallWorkloadM900Store();
  const [detail, setDetail] = useState<OutpatientHallWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="门诊大厅管理"
      description="日期 / 门诊人次 / 挂号 / 候诊 / 收费 / 取药 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`门诊大厅工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="门诊大厅工作详情"
        width={880}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
            <Descriptions.Item label="门诊人次">{detail.visits}</Descriptions.Item>
            <Descriptions.Item label="挂号人次">{detail.registered}</Descriptions.Item>
            <Descriptions.Item label="候诊人数">{detail.waiting}</Descriptions.Item>
            <Descriptions.Item label="收费人次">{detail.billed}</Descriptions.Item>
            <Descriptions.Item label="取药人次">{detail.dispensed}</Descriptions.Item>
            <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
            <Descriptions.Item label="门诊流量（早/午/晚高峰）" span={2}>{detail.peakFlow}</Descriptions.Item>
            <Descriptions.Item label="候诊时长" span={2}>{detail.waitTime}</Descriptions.Item>
            <Descriptions.Item label="收费窗口使用" span={2}>{detail.billingWindows}</Descriptions.Item>
            <Descriptions.Item label="取药窗口使用" span={2}>{detail.pharmacyWindows}</Descriptions.Item>
            <Descriptions.Item label="自助机使用情况" span={2}>{detail.kioskUsage}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
