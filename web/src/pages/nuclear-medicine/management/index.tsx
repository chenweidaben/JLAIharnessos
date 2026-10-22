/**
 * 健澜科技 jlmedaios - 核医学科管理（M881 原地升级 M810 视图）
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
import { useNuclearMedicineWorkloadM881Store } from '@/store/nuclearMedicineWorkloadM881Store';
import type { NuclearMedicineWorkloadM881 } from '@/services/api/nuclearMedicineWorkloadM881';

const simpleColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '项目', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: NuclearMedicineWorkloadM881) => void): ColumnsType<NuclearMedicineWorkloadM881> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: 'SPECT 检查数', dataIndex: 'spect', width: 140, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: 'PET-CT 检查数', dataIndex: 'petCt', width: 150, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '碘131 治疗数', dataIndex: 'i131Treatment', width: 140, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '骨扫描数', dataIndex: 'boneScan', width: 120, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
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

export default function NuclearMedicineManagementM881Page() {
  usePageTitle('核医学科管理');
  const { items, loading, error, demo, load } = useNuclearMedicineWorkloadM881Store();
  const [detail, setDetail] = useState<NuclearMedicineWorkloadM881 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="核医学科管理"
      description="日期 / SPECT 数 / PET-CT 数 / 碘131 治疗数 / 骨扫描数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`核医学科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="核医学科工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="SPECT 检查数">{detail.spect}</Descriptions.Item>
              <Descriptions.Item label="PET-CT 数">{detail.petCt}</Descriptions.Item>
              <Descriptions.Item label="碘131 治疗数">{detail.i131Treatment}</Descriptions.Item>
              <Descriptions.Item label="骨扫描数">{detail.boneScan}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="放射性药物（99mTc/18F-FDG/131I）" span={2}>{detail.radiopharmaceuticals}</Descriptions.Item>
              <Descriptions.Item label="辐射防护记录" span={2}>{detail.radiationProtection}</Descriptions.Item>
            </Descriptions>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card size="small" title="检查项目分类（SPECT/PET-CT/骨扫描/甲状腺吸碘）">
                <Table rowKey="name" dataSource={detail.examBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
              <Card size="small" title="治疗项目（碘131 甲亢/分化型甲癌/云克）">
                <Table rowKey="name" dataSource={detail.treatmentBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
            </div>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
