/**
 * 健澜科技 jlmedaios - ICU 管理（M884 原地升级 M844 视图）
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
import { useIcuWorkloadM884Store } from '@/store/icuWorkloadM884Store';
import type { IcuWorkloadM884 } from '@/services/api/icuWorkloadM884';

const apacheColumns: ColumnsType<{ name: string; count: number }> = [
  { title: 'APACHE II 分布', dataIndex: 'name' },
  { title: '人数', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: IcuWorkloadM884) => void): ColumnsType<IcuWorkloadM884> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '开放床位', dataIndex: 'openBeds', width: 110, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '实际占用', dataIndex: 'occupiedBeds', width: 110, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: 'APACHE II 均分', dataIndex: 'apacheAvg', width: 140, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '机械通气数', dataIndex: 'vent', width: 120, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: 'CRRT 数', dataIndex: 'crrt', width: 110, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
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

export default function IcuManagementM884Page() {
  usePageTitle('ICU 管理');
  const { items, loading, error, demo, load } = useIcuWorkloadM884Store();
  const [detail, setDetail] = useState<IcuWorkloadM884 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="ICU 管理"
      description="日期 / 开放床位 / 实际占用 / APACHE II 评分 / 机械通气 / CRRT / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`ICU 工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1500 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="ICU 工作详情"
        width={880}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="开放床位">{detail.openBeds}</Descriptions.Item>
              <Descriptions.Item label="实际占用">{detail.occupiedBeds}</Descriptions.Item>
              <Descriptions.Item label="APACHE II 均分">{detail.apacheAvg}</Descriptions.Item>
              <Descriptions.Item label="机械通气数">{detail.vent}</Descriptions.Item>
              <Descriptions.Item label="CRRT 数">{detail.crrt}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="机械通气（插管/气切）" span={2}>{detail.ventilation}</Descriptions.Item>
              <Descriptions.Item label="CRRT 明细" span={2}>{detail.crrtDetail}</Descriptions.Item>
              <Descriptions.Item label="中心静脉导管（CVC）" span={2}>{detail.cvc}</Descriptions.Item>
              <Descriptions.Item label="VAP/CLABSI/CAUTI 发生率" span={2}>{detail.haiRates}</Descriptions.Item>
              <Descriptions.Item label="ICU 死亡率" span={2}>{detail.mortality}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="APACHE II 评分分布">
              <Table rowKey="name" dataSource={detail.apacheDistribution} columns={apacheColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
