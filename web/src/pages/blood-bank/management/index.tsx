/**
 * 健澜科技 jlmedaios - 输血科管理（M878）
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
import { useBloodBankWorkloadM878Store } from '@/store/bloodBankWorkloadM878Store';
import type { BloodBankWorkload } from '@/services/api/bloodBankWorkloadM878';

const simpleColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '项目', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: BloodBankWorkload) => void): ColumnsType<BloodBankWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '悬浮红细胞(U)', dataIndex: 'rbc', width: 140, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '血浆(U)', dataIndex: 'plasma', width: 110, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  { title: '血小板(治疗量)', dataIndex: 'platelets', width: 160, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '冷沉淀(U)', dataIndex: 'cryoprecipitate', width: 130, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  {
    title: '输血不良反应',
    dataIndex: 'reactions',
    width: 130,
    align: 'right',
    render: (v: number) => <Tag color={v === 0 ? 'green' : 'red'}>{v}</Tag>,
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

export default function BloodBankManagementM878Page() {
  usePageTitle('输血科管理');
  const { items, loading, error, demo, load } = useBloodBankWorkloadM878Store();
  const [detail, setDetail] = useState<BloodBankWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="输血科管理"
      description="日期 / 悬浮红细胞 / 血浆 / 血小板 / 冷沉淀 / 输血不良反应 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`输血科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1500 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="输血科工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="悬浮红细胞">{detail.rbc} U</Descriptions.Item>
              <Descriptions.Item label="血浆">{detail.plasma} U</Descriptions.Item>
              <Descriptions.Item label="血小板">{detail.platelets} 治疗量</Descriptions.Item>
              <Descriptions.Item label="冷沉淀">{detail.cryoprecipitate} U</Descriptions.Item>
              <Descriptions.Item label="输血不良反应">{detail.reactions} 例</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="自体输血记录" span={2}>{detail.autologous}</Descriptions.Item>
              <Descriptions.Item label="血液入库（献血站/数量/血型）" span={2}>{detail.inbound}</Descriptions.Item>
              <Descriptions.Item label="血液出库（手术/抢救/贫血）" span={2}>{detail.outbound}</Descriptions.Item>
            </Descriptions>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card size="small" title="血型分布（A/B/O/AB）">
                <Table rowKey="name" dataSource={detail.bloodTypeBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
              <Card size="small" title="输血不良反应（发热/过敏/溶血）">
                <Table rowKey="name" dataSource={detail.reactionsBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
            </div>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
