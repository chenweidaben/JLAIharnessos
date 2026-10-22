/**
 * 健澜科技 jlmedaios - 护理管理（M889）
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
import { useNursingWorkloadM889Store } from '@/store/nursingWorkloadM889Store';
import type { NursingWorkload } from '@/services/api/nursingWorkloadM889';

const careLevelColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '护理级别', dataIndex: 'name' },
  { title: '人数', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: NursingWorkload) => void): ColumnsType<NursingWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '护理人次', dataIndex: 'totalNursing', width: 110, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '分级护理数', dataIndex: 'gradedCare', width: 120, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '一级护理数', dataIndex: 'level1', width: 120, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '特级护理数', dataIndex: 'special', width: 120, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  {
    title: '护理不良事件',
    dataIndex: 'adverseEvents',
    width: 140,
    align: 'right',
    render: (v: number) => <Tag color={v === 0 ? 'green' : 'orange'}>{v}</Tag>,
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

export default function NursingManagementM889Page() {
  usePageTitle('护理管理');
  const { items, loading, error, demo, load } = useNursingWorkloadM889Store();
  const [detail, setDetail] = useState<NursingWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="护理管理"
      description="日期 / 护理人次 / 分级护理 / 一级护理 / 特级护理 / 护理不良事件 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`护理工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1500 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="护理工作详情"
        width={880}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="护理人次">{detail.totalNursing}</Descriptions.Item>
              <Descriptions.Item label="分级护理数">{detail.gradedCare}</Descriptions.Item>
              <Descriptions.Item label="一级护理数">{detail.level1}</Descriptions.Item>
              <Descriptions.Item label="特级护理数">{detail.special}</Descriptions.Item>
              <Descriptions.Item label="护理不良事件">{detail.adverseEvents} 例</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="护理质控（压疮/跌倒/管路滑脱）" span={2}>{detail.qualityControl}</Descriptions.Item>
              <Descriptions.Item label="护理培训（新护士/继续教育）" span={2}>{detail.training}</Descriptions.Item>
              <Descriptions.Item label="护理排班（白班/小夜/大夜）" span={2}>{detail.scheduling}</Descriptions.Item>
              <Descriptions.Item label="护患沟通满意度" span={2}>{detail.satisfaction}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="分级护理（特级/一级/二级/三级）">
              <Table rowKey="name" dataSource={detail.careLevelBreakdown} columns={careLevelColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
