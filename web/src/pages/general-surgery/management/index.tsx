/**
 * 健澜科技 jlmedaios - 普外科管理（M863）
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
import { useGeneralSurgeryWorkloadM863Store } from '@/store/generalSurgeryWorkloadM863Store';
import type { GeneralSurgeryWorkload } from '@/services/api/generalSurgeryWorkloadM863';

const surgeryColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '手术类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: GeneralSurgeryWorkload) => void): ColumnsType<GeneralSurgeryWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊数', dataIndex: 'outpatient', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '住院数', dataIndex: 'inpatient', width: 100, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '手术数', dataIndex: 'surgeries', width: 100, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '微创手术数', dataIndex: 'minimallyInvasive', width: 130, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '急诊手术数', dataIndex: 'emergencySurgeries', width: 130, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
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

export default function GeneralSurgeryManagementM863Page() {
  usePageTitle('普外科管理');
  const { items, loading, error, demo, load } = useGeneralSurgeryWorkloadM863Store();
  const [detail, setDetail] = useState<GeneralSurgeryWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="普外科管理"
      description="日期 / 门诊数 / 住院数 / 手术数 / 微创手术数 / 急诊手术数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`普外科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="普外科工作详情"
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
              <Descriptions.Item label="微创手术数">{detail.minimallyInvasive}</Descriptions.Item>
              <Descriptions.Item label="急诊手术数">{detail.emergencySurgeries}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="腹腔镜手术记录" span={2}>{detail.laparoscopicRecords}</Descriptions.Item>
              <Descriptions.Item label="急诊手术记录" span={2}>{detail.emergencyRecords}</Descriptions.Item>
              <Descriptions.Item label="术后并发症（切口感染/出血/肠瘘）" span={2}>{detail.complications}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="手术类型分解（阑尾/胆囊/疝/胃肠/乳腺/甲状腺）">
              <Table rowKey="name" dataSource={detail.surgeryBreakdown} columns={surgeryColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
