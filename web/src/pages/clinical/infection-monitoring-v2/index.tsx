/**
 * 健澜科技 jlmedaios - 院感监测（M662，配套 M553）
 *
 * 三甲流程：监测 Table（感染部位/病原菌/隔离措施）+ 隔离类型统计卡。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import { Alert, Card, Col, Progress, Row, Spin, Statistic, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useInfectionMonitoringV2M662Store } from '@/store/infectionMonitoringV2M662Store';
import {
  ISOLATION_META,
  type InfectionMonitoringItem,
} from '@/services/api/infectionMonitoringV2M662';

const columns: ColumnsType<InfectionMonitoringItem> = [
  { title: '编号', dataIndex: 'id', width: 90 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '科室', dataIndex: 'dept', width: 110 },
  { title: '感染部位', dataIndex: 'infectionSite', ellipsis: true },
  { title: '病原菌', dataIndex: 'pathogen', width: 220, ellipsis: true },
  {
    title: '隔离措施',
    dataIndex: 'isolationMeasure',
    width: 140,
    render: (v: InfectionMonitoringItem['isolationMeasure']) => (
      <Tag color={ISOLATION_META[v].color}>{ISOLATION_META[v].label}</Tag>
    ),
  },
  { title: '发生时间', dataIndex: 'onsetAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  { title: '上报时间', dataIndex: 'reportedAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  { title: '上报护士', dataIndex: 'nurse', width: 100 },
];

export default function InfectionMonitoringV2M662Page() {
  usePageTitle('院感监测');

  const { bundle, loading, error, demo, load } = useInfectionMonitoringV2M662Store();

  useEffect(() => {
    void load();
  }, [load]);

  const items = bundle?.items ?? [];
  const maxCount = Math.max(1, ...items.map(() => 1));

  return (
    <PageContainer
      title="院感监测（v2）"
      description="感染部位 / 病原菌 / 隔离措施"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="当前在管感染例数" value={items.length} />
          </Card>
        </Col>
        {(bundle?.byIsolation ?? []).map((b) => (
          <Col span={6} key={b.measure}>
            <Card size="small">
              <Statistic
                title={ISOLATION_META[b.measure].label}
                value={b.count}
                valueStyle={{ color: b.count > 0 ? ISOLATION_META[b.measure].color : undefined }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card size="small" title={`监测例数（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Card size="small" title="感染部位分布" style={{ marginTop: 16 }}>
        {(bundle?.bySite ?? []).map((s) => (
          <div key={s.site} style={{ marginBottom: 8 }}>
            <div style={{ marginBottom: 4, fontSize: 12 }}>{s.site}（{s.count} 例）</div>
            <Progress percent={Math.round((s.count / maxCount) * 100)} size="small" />
          </div>
        ))}
      </Card>
    </PageContainer>
  );
}
