/**
 * 健澜科技 jlmedaios - 皮肤科管理（M855 原地升级 M825 视图）
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
import { useDermatologyWorkloadM855Store } from '@/store/dermatologyWorkloadM855Store';
import type { DermatologyWorkloadM855 } from '@/services/api/dermatologyWorkloadM855';

const diseaseColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '疾病类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: DermatologyWorkloadM855) => void): ColumnsType<DermatologyWorkloadM855> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊数', dataIndex: 'outpatient', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '激光治疗数', dataIndex: 'laser', width: 130, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '冷冻治疗数', dataIndex: 'cryotherapy', width: 130, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '真菌检查数', dataIndex: 'fungal', width: 130, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  { title: '皮肤镜数', dataIndex: 'dermoscopy', width: 120, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function DermatologyManagementM855Page() {
  usePageTitle('皮肤科管理');
  const { items, loading, error, demo, load } = useDermatologyWorkloadM855Store();
  const [detail, setDetail] = useState<DermatologyWorkloadM855 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="皮肤科管理"
      description="日期 / 门诊数 / 激光治疗数 / 冷冻治疗数 / 真菌检查数 / 皮肤镜数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`皮肤科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="皮肤科工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="门诊数">{detail.outpatient}</Descriptions.Item>
              <Descriptions.Item label="激光治疗数">{detail.laser}</Descriptions.Item>
              <Descriptions.Item label="冷冻治疗数">{detail.cryotherapy}</Descriptions.Item>
              <Descriptions.Item label="真菌检查数">{detail.fungal}</Descriptions.Item>
              <Descriptions.Item label="皮肤镜数">{detail.dermoscopy}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="治疗记录（激光/冷冻/光疗）" span={2}>{detail.treatmentRecords}</Descriptions.Item>
              <Descriptions.Item label="真菌检查" span={2}>{detail.fungalExam}</Descriptions.Item>
              <Descriptions.Item label="皮肤肿瘤筛查" span={2}>{detail.skinTumorScreen}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="疾病谱分解（湿疹/银屑病/痤疮/白癜风）">
              <Table rowKey="name" dataSource={detail.diseaseBreakdown} columns={diseaseColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
