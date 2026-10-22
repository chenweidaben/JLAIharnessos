/**
 * 健澜科技 jlmedaios - 后勤保障管理（M912）
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
import { useLogisticsWorkloadM912Store } from '@/store/logisticsWorkloadM912Store';
import type { LogisticsWorkload } from '@/services/api/logisticsWorkloadM912';

const repairColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '维修分类', dataIndex: 'name' },
  { title: '工单数', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: LogisticsWorkload) => void): ColumnsType<LogisticsWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '报修工单数', dataIndex: 'repairOrders', width: 130, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '维修完成数', dataIndex: 'repairCompleted', width: 130, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '被服洗涤数', dataIndex: 'laundryBatches', width: 130, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '餐饮供应人次', dataIndex: 'cateringVisits', width: 150, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  { title: '绿化保洁面积(㎡)', dataIndex: 'greenArea', width: 180, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function LogisticsManagementM912Page() {
  usePageTitle('后勤保障管理');
  const { items, loading, error, demo, load } = useLogisticsWorkloadM912Store();
  const [detail, setDetail] = useState<LogisticsWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="后勤保障管理"
      description="日期 / 报修工单 / 维修完成 / 被服洗涤 / 餐饮 / 绿化保洁 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`后勤保障工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1600 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="后勤保障工作详情"
        width={920}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="报修工单数">{detail.repairOrders}</Descriptions.Item>
              <Descriptions.Item label="维修完成数">{detail.repairCompleted}</Descriptions.Item>
              <Descriptions.Item label="被服洗涤数">{detail.laundryBatches}</Descriptions.Item>
              <Descriptions.Item label="餐饮供应人次">{detail.cateringVisits}</Descriptions.Item>
              <Descriptions.Item label="绿化保洁面积">{detail.greenArea} ㎡</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="被服洗涤（病区/手术室/ICU）" span={2}>{detail.laundryDetail}</Descriptions.Item>
              <Descriptions.Item label="餐饮供应（职工/患者/手术餐）" span={2}>{detail.cateringDetail}</Descriptions.Item>
              <Descriptions.Item label="绿化保洁" span={2}>{detail.greenCleaning}</Descriptions.Item>
              <Descriptions.Item label="医疗废物处置" span={2}>{detail.medicalWaste}</Descriptions.Item>
              <Descriptions.Item label="污水污物处理" span={2}>{detail.sewage}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="维修工单分类（水电/空调/电梯/家具）">
              <Table rowKey="name" dataSource={detail.repairBreakdown} columns={repairColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
