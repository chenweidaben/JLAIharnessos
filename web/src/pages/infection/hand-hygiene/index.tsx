/**
 * 健澜科技 jlmedaios - 手卫生依从性监测（M704）
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
import { useHandHygieneM704Store } from '@/store/handHygieneM704Store';
import {
  handHygieneRate,
  handHygieneRateMeta,
  type HandHygieneObservation,
} from '@/services/api/handHygieneM704';

const fiveMomentColumns: ColumnsType<{ moment: string; times: number }> = [
  { title: '手卫生 5 时刻', dataIndex: 'moment' },
  { title: '执行次数', dataIndex: 'times', align: 'right' },
];

const buildColumns = (setDetail: (r: HandHygieneObservation) => void): ColumnsType<HandHygieneObservation> => [
  { title: '科室', dataIndex: 'dept', width: 140 },
  { title: '观察人数', dataIndex: 'observed', width: 100, align: 'right' },
  { title: '依从次数', dataIndex: 'compliant', width: 100, align: 'right' },
  {
    title: '依从率',
    width: 180,
    render: (_v, row) => {
      const r = handHygieneRate(row);
      const meta = handHygieneRateMeta(r);
      return <Tag color={meta.color}>{r}%（{meta.label}）</Tag>;
    },
  },
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

export default function HandHygieneM704Page() {
  usePageTitle('手卫生依从性监测');
  const { items, loading, error, demo, load } = useHandHygieneM704Store();
  const [detail, setDetail] = useState<HandHygieneObservation | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  const fiveMoments = detail
    ? [
        { moment: '①接触患者前', times: detail.beforePatientContact },
        { moment: '②无菌操作前', times: detail.beforeAseptic },
        { moment: '③暴露体液后', times: detail.afterBodyFluid },
        { moment: '④接触患者后', times: detail.afterPatientContact },
        { moment: '⑤接触患者周围后', times: detail.afterSurrounding },
      ]
    : [];

  return (
    <PageContainer
      title="手卫生依从性监测"
      description="科室 / 观察人数 / 依从次数 / 依从率"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`观察记录（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="手卫生观察详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="科室">{detail.dept}</Descriptions.Item>
              <Descriptions.Item label="依从率">
                {handHygieneRate(detail)}%（{handHygieneRateMeta(handHygieneRate(detail)).label}）
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="5 时刻依从性分解" style={{ marginBottom: 16 }}>
              <Table rowKey="moment" dataSource={fiveMoments} columns={fiveMomentColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="反馈与整改">{detail.feedback}</Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
