/**
 * 健澜科技 jlmedaios - 放疗科管理（M882 原地升级 M809 视图）
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
import { useRadiationOncologyWorkloadM882Store } from '@/store/radiationOncologyWorkloadM882Store';
import type { RadiationOncologyWorkloadM882 } from '@/services/api/radiationOncologyWorkloadM882';

const simpleColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '项目', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: RadiationOncologyWorkloadM882) => void): ColumnsType<RadiationOncologyWorkloadM882> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '放疗患者数', dataIndex: 'patients', width: 130, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '直线加速器治疗数', dataIndex: 'linac', width: 170, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '伽马刀数', dataIndex: 'gammaKnife', width: 120, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '后装机数', dataIndex: 'afterloader', width: 120, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
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

export default function RadiationOncologyManagementM882Page() {
  usePageTitle('放疗科管理');
  const { items, loading, error, demo, load } = useRadiationOncologyWorkloadM882Store();
  const [detail, setDetail] = useState<RadiationOncologyWorkloadM882 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="放疗科管理"
      description="日期 / 放疗患者数 / 直线加速器治疗数 / 伽马刀数 / 后装机数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`放疗科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="放疗科工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="放疗患者数">{detail.patients}</Descriptions.Item>
              <Descriptions.Item label="直线加速器治疗数">{detail.linac}</Descriptions.Item>
              <Descriptions.Item label="伽马刀数">{detail.gammaKnife}</Descriptions.Item>
              <Descriptions.Item label="后装机数">{detail.afterloader}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="设备使用（瓦里安/医科达直线加速器）" span={2}>{detail.equipment}</Descriptions.Item>
              <Descriptions.Item label="放疗计划验证记录" span={2}>{detail.planVerification}</Descriptions.Item>
            </Descriptions>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card size="small" title="病种分类（肺癌/乳腺癌/鼻咽癌/食管癌/直肠癌）">
                <Table rowKey="name" dataSource={detail.diseaseBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
              <Card size="small" title="放疗方式（根治/姑息/术前新辅助/术后辅助）">
                <Table rowKey="name" dataSource={detail.intentBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
            </div>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
