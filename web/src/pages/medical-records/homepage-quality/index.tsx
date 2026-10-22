/**
 * 健澜科技 jlmedaios - 病案首页质控（M710）
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
import { useHomepageQualityM710Store } from '@/store/homepageQualityM710Store';
import type { HomepageQuality } from '@/services/api/homepageQualityM710';

const scoreColor = (s: number): string => (s >= 95 ? 'green' : s >= 85 ? 'blue' : s >= 70 ? 'orange' : 'red');

const buildColumns = (setDetail: (r: HomepageQuality) => void): ColumnsType<HomepageQuality> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 120 },
  { title: '主要诊断编码', dataIndex: 'mainDxCode', width: 140 },
  { title: '手术编码', dataIndex: 'surgeryCode', width: 130 },
  {
    title: '质控得分',
    dataIndex: 'score',
    width: 110,
    align: 'right',
    render: (v: number) => <Tag color={scoreColor(v)}>{v}</Tag>,
  },
  {
    title: '缺陷项数',
    dataIndex: 'defects',
    width: 110,
    align: 'right',
    render: (arr: string[]) =>
      arr.length ? <Tag color="red">{arr.length}</Tag> : <Tag color="green">0</Tag>,
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

export default function HomepageQualityM710Page() {
  usePageTitle('病案首页质控');
  const { items, loading, error, demo, load } = useHomepageQualityM710Store();
  const [detail, setDetail] = useState<HomepageQuality | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="病案首页质控"
      description="住院号 / 主要诊断编码 / 手术编码 / 质控得分 / 缺陷项数"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`首页质控（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="病案首页质控详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
            <Descriptions.Item label="主要诊断编码">{detail.mainDxCode}</Descriptions.Item>
            <Descriptions.Item label="手术编码">{detail.surgeryCode}</Descriptions.Item>
            <Descriptions.Item label="质控得分">
              <Tag color={scoreColor(detail.score)}>{detail.score} 分</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="缺陷项清单">
              {detail.defects.length
                ? detail.defects.map((d) => <Tag key={d} color="red" style={{ marginBottom: 4 }}>{d}</Tag>)
                : <span style={{ color: '#3f8600' }}>无缺陷</span>}
            </Descriptions.Item>
            <Descriptions.Item label="编码错误">
              {detail.codingErrors.length
                ? detail.codingErrors.map((c) => <Tag key={c} color="orange" style={{ marginBottom: 4 }}>{c}</Tag>)
                : <span style={{ color: '#3f8600' }}>无</span>}
            </Descriptions.Item>
            <Descriptions.Item label="逻辑矛盾">
              {detail.logicConflicts.length
                ? detail.logicConflicts.map((l) => <Tag key={l} color="volcano" style={{ marginBottom: 4 }}>{l}</Tag>)
                : <span style={{ color: '#3f8600' }}>无</span>}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
