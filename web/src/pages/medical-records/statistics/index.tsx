/**
 * 健澜科技 jlmedaios - 病案统计管理（M903）
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
import { useMedicalRecordsStatisticsWorkloadM903Store } from '@/store/medicalRecordsStatisticsWorkloadM903Store';
import type { MedicalRecordsStatisticsWorkload } from '@/services/api/medicalRecordsStatisticsWorkloadM903';

const dischargeColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '病区分类', dataIndex: 'name' },
  { title: '出院数', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: MedicalRecordsStatisticsWorkload) => void): ColumnsType<MedicalRecordsStatisticsWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '出院人数', dataIndex: 'discharges', width: 110, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '病案归档数', dataIndex: 'archived', width: 120, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  {
    title: '病案首页质控得分(%)',
    dataIndex: 'homepageQuality',
    width: 180,
    align: 'right',
    render: (v: number) => <Tag color={v >= 95 ? 'green' : 'orange'}>{v}%</Tag>,
  },
  { title: 'DRG 入组数', dataIndex: 'drgGrouped', width: 130, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  {
    title: 'ICD 编码正确率(%)',
    dataIndex: 'icdAccuracy',
    width: 180,
    align: 'right',
    render: (v: number) => <Tag color={v >= 95 ? 'green' : 'orange'}>{v}%</Tag>,
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

export default function MedicalRecordsStatisticsM903Page() {
  usePageTitle('病案统计管理');
  const { items, loading, error, demo, load } = useMedicalRecordsStatisticsWorkloadM903Store();
  const [detail, setDetail] = useState<MedicalRecordsStatisticsWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="病案统计管理"
      description="日期 / 出院人数 / 归档 / 首页质控 / DRG 入组 / ICD 正确率 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`病案统计工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1600 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="病案统计工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="出院人数">{detail.discharges}</Descriptions.Item>
              <Descriptions.Item label="病案归档数">{detail.archived}</Descriptions.Item>
              <Descriptions.Item label="病案首页质控得分">{detail.homepageQuality}%</Descriptions.Item>
              <Descriptions.Item label="DRG 入组数">{detail.drgGrouped}</Descriptions.Item>
              <Descriptions.Item label="ICD 编码正确率">{detail.icdAccuracy}%</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="病案归档时效" span={2}>{detail.archiveTimeliness}</Descriptions.Item>
              <Descriptions.Item label="病案首页质控缺陷" span={2}>{detail.homepageDefects}</Descriptions.Item>
              <Descriptions.Item label="DRG 分组结果" span={2}>{detail.drgResult}</Descriptions.Item>
              <Descriptions.Item label="ICD 编码质量" span={2}>{detail.icdQuality}</Descriptions.Item>
              <Descriptions.Item label="统计报表" span={2}>{detail.reports}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="出院患者统计（内科/外科/妇儿/ICU）">
              <Table rowKey="name" dataSource={detail.dischargeBreakdown} columns={dischargeColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
