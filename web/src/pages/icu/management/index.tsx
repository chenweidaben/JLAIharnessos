/**
 * 健澜科技 jlmedaios - ICU 管理（M814）
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
import { useIcuWorkloadM814Store } from '@/store/icuWorkloadM814Store';
import type { IcuWorkload } from '@/services/api/icuWorkloadM814';

const buildColumns = (setDetail: (r: IcuWorkload) => void): ColumnsType<IcuWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '床位数', dataIndex: 'beds', width: 90, align: 'right' },
  { title: '入院数', dataIndex: 'admissions', width: 90, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '出院数', dataIndex: 'discharges', width: 90, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  {
    title: '死亡数',
    dataIndex: 'deaths',
    width: 90,
    align: 'right',
    render: (v: number) => <Tag color={v > 0 ? 'red' : 'default'}>{v}</Tag>,
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

export default function IcuManagementM814Page() {
  usePageTitle('ICU 管理');
  const { items, loading, error, demo, load } = useIcuWorkloadM814Store();
  const [detail, setDetail] = useState<IcuWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="ICU 管理"
      description="日期 / 床位数 / 入院数 / 出院数 / 死亡数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`ICU 工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="ICU 工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
            <Descriptions.Item label="床位数">{detail.beds}</Descriptions.Item>
            <Descriptions.Item label="入院数">{detail.admissions}</Descriptions.Item>
            <Descriptions.Item label="出院数">{detail.discharges}</Descriptions.Item>
            <Descriptions.Item label="死亡数">{detail.deaths}</Descriptions.Item>
            <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
            <Descriptions.Item label="床位使用" span={2}>{detail.bedUsage}</Descriptions.Item>
            <Descriptions.Item label="APACHE II 评分" span={2}>{detail.apache2}</Descriptions.Item>
            <Descriptions.Item label="机械通气记录" span={2}>{detail.ventilation}</Descriptions.Item>
            <Descriptions.Item label="血管活性药物" span={2}>{detail.vasopressors}</Descriptions.Item>
            <Descriptions.Item label="CRRT 记录" span={2}>{detail.crrt}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
