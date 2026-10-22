/**
 * 健澜科技 jlmedaios - 安全生产管理（M911）
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
import { useSafetyProductionWorkloadM911Store } from '@/store/safetyProductionWorkloadM911Store';
import type { SafetyProductionWorkload } from '@/services/api/safetyProductionWorkloadM911';

const inspectionColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '检查类型', dataIndex: 'name' },
  { title: '次数', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: SafetyProductionWorkload) => void): ColumnsType<SafetyProductionWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '安全检查次数', dataIndex: 'inspections', width: 140, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '隐患整改数', dataIndex: 'hazardsRectified', width: 130, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  {
    title: '安全事故数',
    dataIndex: 'accidents',
    width: 130,
    align: 'right',
    render: (v: number) => <Tag color={v === 0 ? 'green' : 'red'}>{v}</Tag>,
  },
  { title: '消防演练次数', dataIndex: 'fireDrills', width: 140, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  { title: '安全教育培训人次', dataIndex: 'trainingVisits', width: 180, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function SafetyProductionM911Page() {
  usePageTitle('安全生产管理');
  const { items, loading, error, demo, load } = useSafetyProductionWorkloadM911Store();
  const [detail, setDetail] = useState<SafetyProductionWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="安全生产管理"
      description="日期 / 安全检查 / 隐患整改 / 事故 / 消防演练 / 培训 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`安全生产工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1600 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="安全生产工作详情"
        width={920}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="安全检查次数">{detail.inspections}</Descriptions.Item>
              <Descriptions.Item label="隐患整改数">{detail.hazardsRectified}</Descriptions.Item>
              <Descriptions.Item label="安全事故数">{detail.accidents}</Descriptions.Item>
              <Descriptions.Item label="消防演练次数">{detail.fireDrills}</Descriptions.Item>
              <Descriptions.Item label="安全教育培训人次">{detail.trainingVisits}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="隐患排查与整改" span={2}>{detail.hazardDetail}</Descriptions.Item>
              <Descriptions.Item label="消防安全（通道/灭火器/喷淋）" span={2}>{detail.fireSafety}</Descriptions.Item>
              <Descriptions.Item label="特种设备（电梯/锅炉/压力容器）" span={2}>{detail.specialEquipment}</Descriptions.Item>
              <Descriptions.Item label="危化品管理" span={2}>{detail.hazmat}</Descriptions.Item>
              <Descriptions.Item label="安全事故应急" span={2}>{detail.emergency}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="安全检查（综合/专项/季节性）">
              <Table rowKey="name" dataSource={detail.inspectionBreakdown} columns={inspectionColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
