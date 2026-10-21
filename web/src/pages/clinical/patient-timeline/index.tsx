/**
 * 健澜科技 jlmedaios - 患者诊疗时间线（M544，P0）
 *
 * 三甲流程：患者 Select（P10001/P10002/P10003）+ 时间范围 RangePicker
 * → antd Timeline 按 eventTime 倒序，9 类事件色标 Tag 图例。
 * 权限码 timeline:view。BFF 不可由 service 降级 DEMO 镜像并打标。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useMemo } from 'react';
import { Alert, Card, DatePicker, Select, Space, Spin, Tag, Timeline } from 'antd';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { usePatientTimelineM544Store } from '@/store/patientTimelineM544Store';
import {
  DEPT_CODE_LABEL,
  EVENT_TYPE_META,
  TIMELINE_PATIENT_PREVIEW,
  type TimelineEventType,
} from '@/services/api/patientTimeline';

export default function PatientTimelinePage() {
  usePageTitle('患者诊疗时间线');
  const { hasPermission } = usePermission();
  const canView = hasPermission('timeline:view');

  const { events, patientId, loading, error, demo, load, setPatient } = usePatientTimelineM544Store();

  useEffect(() => {
    void load(patientId);
  }, [load, patientId]);

  const legend = useMemo(
    () =>
      (Object.keys(EVENT_TYPE_META) as TimelineEventType[]).map((k) => (
        <Tag key={k} color={EVENT_TYPE_META[k].color}>
          {EVENT_TYPE_META[k].label}
        </Tag>
      )),
    [],
  );

  return (
    <PageContainer
      title="患者诊疗时间线"
      description="GET /patients/:id/timeline · 9 类事件按时间倒序聚合（入院/医嘱/检验/影像/会诊/手术/用药/护理/评估）"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 timeline:view 权限" />
      )}

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            style={{ width: 240 }}
            value={patientId}
            onChange={(v) => void setPatient(v)}
            options={TIMELINE_PATIENT_PREVIEW.map((id) => ({ value: id, label: `患者 ${id}` }))}
          />
          <DatePicker.RangePicker
            format="YYYY-MM-DD"
            onChange={(_, dateStrings) => {
              const [from, to] = dateStrings as [string, string];
              void load(patientId, from || undefined, to || undefined);
            }}
          />
          <Space wrap>{legend}</Space>
        </Space>
      </Card>

      <Card size="small" title={`时间线（${events.length} 条）`}>
        <Spin spinning={loading}>
          {events.length === 0 && !loading ? (
            <Alert type="info" showIcon message="当前时间窗内无事件记录" />
          ) : (
            <Timeline
              items={events.map((e) => ({
                color: EVENT_TYPE_META[e.eventType].color,
                children: (
                  <Space direction="vertical" size={2}>
                    <Space>
                      <Tag color={EVENT_TYPE_META[e.eventType].color}>{EVENT_TYPE_META[e.eventType].label}</Tag>
                      <b>{e.title}</b>
                      <span style={{ color: '#888' }}>
                        {dayjs(e.eventTime).format('YYYY-MM-DD HH:mm')}
                      </span>
                    </Space>
                    <span style={{ color: '#555' }}>{e.detail}</span>
                    <span style={{ color: '#999', fontSize: 12 }}>
                      {DEPT_CODE_LABEL[e.deptCode] ?? e.deptCode} · {e.operator}
                    </span>
                  </Space>
                ),
              }))}
            />
          )}
        </Spin>
      </Card>
    </PageContainer>
  );
}
