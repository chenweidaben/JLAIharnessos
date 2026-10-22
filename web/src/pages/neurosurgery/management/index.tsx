/**
 * 健澜科技 jlmedaios - 神经外科管理（M865）
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
import { useNeurosurgeryWorkloadM865Store } from '@/store/neurosurgeryWorkloadM865Store';
import type { NeurosurgeryWorkload } from '@/services/api/neurosurgeryWorkloadM865';

const surgeryColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '手术类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: NeurosurgeryWorkload) => void): ColumnsType<NeurosurgeryWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊数', dataIndex: 'outpatient', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '住院数', dataIndex: 'inpatient', width: 100, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '手术数', dataIndex: 'surgeries', width: 100, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '颅脑外伤数', dataIndex: 'tbi', width: 130, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  { title: '脑血管手术数', dataIndex: 'cerebrovascular', width: 150, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function NeurosurgeryManagementM865Page() {
  usePageTitle('神经外科管理');
  const { items, loading, error, demo, load } = useNeurosurgeryWorkloadM865Store();
  const [detail, setDetail] = useState<NeurosurgeryWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="神经外科管理"
      description="日期 / 门诊数 / 住院数 / 手术数 / 颅脑外伤数 / 脑血管手术数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`神外工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="神外工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="门诊数">{detail.outpatient}</Descriptions.Item>
              <Descriptions.Item label="住院数">{detail.inpatient}</Descriptions.Item>
              <Descriptions.Item label="手术数">{detail.surgeries}</Descriptions.Item>
              <Descriptions.Item label="颅脑外伤数">{detail.tbi}</Descriptions.Item>
              <Descriptions.Item label="脑血管手术数">{detail.cerebrovascular}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="颅脑外伤记录（硬膜外/硬膜下/脑内血肿）" span={2}>{detail.tbiRecords}</Descriptions.Item>
              <Descriptions.Item label="脑血管手术（动脉瘤夹闭/AVM 切除）" span={2}>{detail.vascularRecords}</Descriptions.Item>
              <Descriptions.Item label="ICU 监护记录" span={2}>{detail.icuMonitoring}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="手术类型分解（颅脑外伤/脑血管/脑肿瘤/功能神外）">
              <Table rowKey="name" dataSource={detail.surgeryBreakdown} columns={surgeryColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
