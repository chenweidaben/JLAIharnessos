/**
 * 健澜科技 jlmedaios - 院感暴发预警看板（M633，配套 M606）
 *
 * 三甲流程：预警 Table（级别 badge 红/橙/蓝）+ 暴发确认时间线 + 7 天监测趋势 Progress。
 * 权限码 infection:viewOutbreak。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import {
  Alert,
  Card,
  Col,
  Progress,
  Row,
  Spin,
  Table,
  Tag,
  Timeline,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useInfectionOutbreakM633Store } from '@/store/infectionOutbreakM633Store';
import {
  ALERT_LEVEL_META,
  type OutbreakAlert,
} from '@/services/api/infectionOutbreakM633';

export default function InfectionOutbreakV2M633Page() {
  usePageTitle('院感暴发预警');
  const { hasPermission } = usePermission();
  const canView = hasPermission('infection:viewOutbreak');

  const { alerts, trend, loading, error, demo, load } = useInfectionOutbreakM633Store();

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<OutbreakAlert> = [
    { title: '预警号', dataIndex: 'id', width: 100 },
    { title: '科室', dataIndex: 'deptName', width: 130 },
    { title: '病原体', dataIndex: 'pathogen', width: 160 },
    { title: '例数', dataIndex: 'casesCount', width: 80 },
    {
      title: '级别',
      dataIndex: 'level',
      width: 130,
      render: (v: OutbreakAlert['level']) => (
        <Tag color={ALERT_LEVEL_META[v].color}>{ALERT_LEVEL_META[v].label}</Tag>
      ),
    },
    { title: '检出时间', dataIndex: 'detectedAt', width: 160, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '说明', dataIndex: 'note', ellipsis: true },
  ];

  const confirmed = alerts.filter((a) => a.level === 'confirmed');
  const maxTrend = Math.max(1, ...trend.map((t) => t.casesCount));

  return (
    <PageContainer
      title="院感暴发预警看板（v2）"
      description="暴发确认 / 疑似暴发 / 常规监测 + 7 天趋势"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 infection:viewOutbreak 权限" />
      )}

      <Spin spinning={loading}>
        <Card size="small" title="预警列表" style={{ marginBottom: 16 }}>
          <Table rowKey="id" dataSource={alerts} columns={columns} size="small" pagination={false} />
        </Card>

        <Row gutter={16}>
          <Col span={14}>
            <Card size="small" title="暴发确认时间线">
              <Timeline
                items={confirmed.map((c) => ({
                  color: 'red',
                  children: (
                    <>
                      <b>
                        {c.deptName} · {c.pathogen}
                      </b>
                      <span style={{ marginLeft: 8, color: '#888', fontSize: 12 }}>
                        {c.confirmedAt ? dayjs(c.confirmedAt).format('MM-DD HH:mm') : '—'}
                      </span>
                      <div style={{ fontSize: 12, marginTop: 4 }}>{c.note}</div>
                    </>
                  ),
                }))}
              />
            </Card>
          </Col>
          <Col span={10}>
            <Card size="small" title="近 7 日监测趋势">
              {trend.map((t) => (
                <div key={t.date} style={{ marginBottom: 8 }}>
                  <span style={{ marginRight: 8, fontSize: 12, width: 70, display: 'inline-block' }}>
                    {dayjs(t.date).format('MM-DD')}（{t.casesCount}）
                  </span>
                  <Progress percent={Math.round((t.casesCount / maxTrend) * 100)} size="small" showInfo={false} />
                </div>
              ))}
            </Card>
          </Col>
        </Row>
      </Spin>
    </PageContainer>
  );
}
