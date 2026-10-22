/**
 * 健澜科技 jlmedaios - 泌尿外科管理（M867）
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
import { useUrologyWorkloadM867Store } from '@/store/urologyWorkloadM867Store';
import type { UrologyWorkload } from '@/services/api/urologyWorkloadM867';

const surgeryColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '手术类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: UrologyWorkload) => void): ColumnsType<UrologyWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊数', dataIndex: 'outpatient', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '住院数', dataIndex: 'inpatient', width: 100, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '手术数', dataIndex: 'surgeries', width: 100, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '经尿道手术数', dataIndex: 'turp', width: 140, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '腹腔镜手术数', dataIndex: 'laparoscopic', width: 150, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function UrologyManagementM867Page() {
  usePageTitle('泌尿外科管理');
  const { items, loading, error, demo, load } = useUrologyWorkloadM867Store();
  const [detail, setDetail] = useState<UrologyWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="泌尿外科管理"
      description="日期 / 门诊数 / 住院数 / 手术数 / 经尿道手术数 / 腹腔镜手术数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`泌尿外科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="泌尿外科工作详情"
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
              <Descriptions.Item label="经尿道手术数">{detail.turp}</Descriptions.Item>
              <Descriptions.Item label="腹腔镜手术数">{detail.laparoscopic}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="经尿道手术（TURP/膀胱肿瘤电切）" span={2}>{detail.transurethralRecords}</Descriptions.Item>
              <Descriptions.Item label="腹腔镜手术（肾癌根治/肾上腺切除）" span={2}>{detail.laparoscopicRecords}</Descriptions.Item>
              <Descriptions.Item label="体外冲击波碎石（ESWL）" span={2}>{detail.eswl}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="手术类型分解（前列腺/结石/肿瘤/肾上腺）">
              <Table rowKey="name" dataSource={detail.surgeryBreakdown} columns={surgeryColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
