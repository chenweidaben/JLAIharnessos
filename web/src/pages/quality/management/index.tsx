/**
 * 健澜科技 jlmedaios - 医疗质量管理（M888）
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
import { useQualityWorkloadM888Store } from '@/store/qualityWorkloadM888Store';
import type { QualityWorkload } from '@/services/api/qualityWorkloadM888';

const recordColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '病历等级', dataIndex: 'name' },
  { title: '份数', dataIndex: 'count', align: 'right' },
];

const pctTag = (v: number, warnThreshold: number, higherIsWorse = true) => {
  const bad = higherIsWorse ? v > warnThreshold : v < warnThreshold;
  return <Tag color={bad ? 'red' : 'green'}>{v}%</Tag>;
};

const buildColumns = (setDetail: (r: QualityWorkload) => void): ColumnsType<QualityWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '病历甲级率', dataIndex: 'recordGradeA', width: 130, align: 'right', render: (v: number) => pctTag(v, 95, false) },
  { title: '手术并发症率', dataIndex: 'surgicalComplication', width: 140, align: 'right', render: (v: number) => pctTag(v, 2) },
  { title: '院内感染率', dataIndex: 'hospitalInfection', width: 130, align: 'right', render: (v: number) => pctTag(v, 2) },
  { title: '压疮发生率', dataIndex: 'pressureUlcer', width: 130, align: 'right', render: (v: number) => pctTag(v, 1) },
  { title: '跌倒发生率', dataIndex: 'falls', width: 120, align: 'right', render: (v: number) => pctTag(v, 0.5) },
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

export default function QualityManagementM888Page() {
  usePageTitle('医疗质量管理');
  const { items, loading, error, demo, load } = useQualityWorkloadM888Store();
  const [detail, setDetail] = useState<QualityWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="医疗质量管理"
      description="日期 / 甲级率 / 手术并发症率 / 院感率 / 压疮 / 跌倒 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`医疗质量工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1500 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="医疗质量工作详情"
        width={880}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="病历甲级率">{detail.recordGradeA}%</Descriptions.Item>
              <Descriptions.Item label="手术并发症率">{detail.surgicalComplication}%</Descriptions.Item>
              <Descriptions.Item label="院内感染率">{detail.hospitalInfection}%</Descriptions.Item>
              <Descriptions.Item label="压疮发生率">{detail.pressureUlcer}%</Descriptions.Item>
              <Descriptions.Item label="跌倒发生率">{detail.falls}%</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="核心制度落实（三级查房/疑难/死亡讨论）" span={2}>{detail.corePolicies}</Descriptions.Item>
              <Descriptions.Item label="手术质量（并发症/死亡率/非计划再次手术）" span={2}>{detail.surgicalQuality}</Descriptions.Item>
              <Descriptions.Item label="单病种质量（心梗/心衰/肺炎）" span={2}>{detail.singleDisease}</Descriptions.Item>
              <Descriptions.Item label="医疗不良事件" span={2}>{detail.adverseEvents}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="病历质量（甲级/乙级/丙级）">
              <Table rowKey="name" dataSource={detail.recordBreakdown} columns={recordColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
