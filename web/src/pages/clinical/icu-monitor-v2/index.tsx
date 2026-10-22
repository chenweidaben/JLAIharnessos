/**
 * 健澜科技 jlmedaios - ICU 监护记录（M654，配套 M581）
 *
 * 三甲流程：监护 Table（心率/血压/SpO2/呼吸/呼吸机参数）+ 趋势 Progress 序列。
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
import { useIcuMonitorV2M654Store } from '@/store/icuMonitorV2M654Store';
import type { IcuMonitorRecord } from '@/services/api/icuMonitorV2M654';

const columns: ColumnsType<IcuMonitorRecord> = [
  { title: '记录号', dataIndex: 'id', width: 90 },
  { title: '时间', dataIndex: 'recordedAt', width: 140, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  { title: 'HR', dataIndex: 'heartRate', width: 80, render: (v: number) => <b>{v}</b> },
  {
    title: 'BP (mmHg)',
    width: 130,
    render: (_v, row) => `${row.bloodPressureSys}/${row.bloodPressureDia}`,
  },
  { title: 'SpO2 (%)', dataIndex: 'spo2', width: 100, render: (v: number) => `${v}%` },
  { title: 'RR', dataIndex: 'respRate', width: 80 },
  { title: '呼吸模式', dataIndex: 'ventilatorMode', width: 100 },
  { title: 'PEEP', dataIndex: 'peep', width: 80, render: (v: number) => `${v} cmH2O` },
  { title: 'FiO2', dataIndex: 'fiO2', width: 90, render: (v: number) => `${v}%` },
];

export default function IcuMonitorV2M654Page() {
  usePageTitle('ICU 监护记录');

  const { items, loading, error, demo, load } = useIcuMonitorV2M654Store();

  useEffect(() => {
    void load();
  }, [load]);

  const latest = items[items.length - 1];

  return (
    <PageContainer
      title="ICU 监护记录（v2）"
      description="心率 / 血压 / SpO2 / 呼吸机参数趋势"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic title="心率 (bpm)" value={latest?.heartRate ?? '—'} valueStyle={{ color: (latest?.heartRate ?? 0) > 100 ? '#cf1322' : '#3f8600' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <Statistic
              title="血压 (mmHg)"
              value={latest ? `${latest.bloodPressureSys}/${latest.bloodPressureDia}` : '—'}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="SpO2 (%)" value={latest?.spo2 ?? '—'} valueStyle={{ color: (latest?.spo2 ?? 100) >= 95 ? '#3f8600' : '#cf1322' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="FiO2 (%)" value={latest?.fiO2 ?? '—'} />
          </Card>
        </Col>
        <Col span={7}>
          <Card size="small" title="SpO2 趋势">
            {items.map((r) => (
              <div key={r.id} style={{ marginBottom: 4 }}>
                <span style={{ marginRight: 8, fontSize: 12 }}>{dayjs(r.recordedAt).format('HH:mm')}</span>
                <Progress
                  percent={r.spo2}
                  size="small"
                  strokeColor={r.spo2 >= 95 ? '#3f8600' : r.spo2 >= 90 ? '#faad14' : '#cf1322'}
                  style={{ width: '85%' }}
                />
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      <Card size="small" title={`监护记录（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 900 }} />
        </Spin>
      </Card>
    </PageContainer>
  );
}
