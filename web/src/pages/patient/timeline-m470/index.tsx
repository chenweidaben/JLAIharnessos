/**
 * 健澜科技 jlmedaios - 患者统一时间线页（M470 P0 合规）
 *
 * 路由：/patient/:id/timeline
 * 按时间倒序聚合门诊就诊 / 住院 / 检验 / 检查 / 用药 / 手术 / 护理 七类事件，
 * 各类事件图标 + 摘要；BFF /timeline/events 未就绪时由 store 注入 DEMO 数据并打标。
 * 深海蓝 VI：主色 #0A2540 / 辅色 #1E5F8C / 强调 #4A90D9。
 * 独立新文件，不覆盖既有 M340 pages/patient/timeline 表格页。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, type ReactElement } from 'react';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  ExperimentOutlined,
  FileDoneOutlined,
  IdcardOutlined,
  MedicineBoxOutlined,
  SolutionOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Col, Empty, Row, Spin, Tag, Timeline, Typography } from 'antd';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { TimelineEventType } from '@/services/api/timeline';
import { usePatientTimelineStore } from '@/store/patientTimelineStore';

const { Text, Title } = Typography;

/** 深海蓝 VI */
const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
} as const;

interface TypeMeta {
  label: string;
  color: string;
  icon: ReactElement;
}

const TYPE_META: Record<TimelineEventType, TypeMeta> = {
  visit: { label: '门诊就诊', color: JL.accent, icon: <IdcardOutlined /> },
  admission: { label: '住院', color: JL.navy, icon: <UserOutlined /> },
  lab: { label: '检验', color: '#389e0d', icon: <ExperimentOutlined /> },
  exam: { label: '检查', color: '#08979c', icon: <SolutionOutlined /> },
  medication: { label: '用药', color: '#d46b08', icon: <MedicineBoxOutlined /> },
  surgery: { label: '手术', color: '#cf1322', icon: <ToolOutlined /> },
  nursing: { label: '护理', color: '#722ed1', icon: <CalendarOutlined /> },
};

const FALLBACK_META: TypeMeta = { label: '其他', color: '#999', icon: <FileDoneOutlined /> };

const metaOf = (t: TimelineEventType): TypeMeta => TYPE_META[t] ?? FALLBACK_META;

const fmt = (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm');

export default function PatientTimelineM470Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  usePageTitle('患者统一时间线');

  const { events, loading, error, demo, setPatientId, load } = usePatientTimelineStore();

  useEffect(() => {
    if (!id) return;
    setPatientId(id);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const typeStats = useMemo(() => {
    const map = new Map<TimelineEventType, number>();
    for (const e of events) map.set(e.eventType, (map.get(e.eventType) ?? 0) + 1);
    return [...map.entries()];
  }, [events]);

  if (loading && events.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载患者时间线…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="患者统一时间线"
      description={`患者 ID：${id ?? '—'} · 跨域事件聚合（门诊/住院/检验/检查/用药/手术/护理）`}
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
      }
    >
      {error && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={error}
          action={
            <Button size="small" onClick={() => void load()}>
              重试
            </Button>
          }
        />
      )}
      {demo && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="当前展示为 DEMO 兜底数据（BFF /timeline/events 接入后自动切换为真实事件）"
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={17}>
          <Card
            title={
              <span style={{ color: JL.navy, fontWeight: 600 }}>
                临床事件时间线
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12, fontWeight: 400 }}>
                  共 {events.length} 条 · 按时间倒序
                </Text>
              </span>
            }
            style={{ borderTop: `3px solid ${JL.navy}` }}
          >
            {events.length === 0 ? (
              <Empty description="暂无事件" />
            ) : (
              <Timeline
                items={events.map((e) => {
                  const meta = metaOf(e.eventType);
                  return {
                    color: meta.color,
                    dot: meta.icon,
                    children: (
                      <div className="mb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Tag color={meta.color}>{meta.label}</Tag>
                          <Text strong style={{ color: JL.navy }}>
                            {e.title}
                          </Text>
                          {e.demo && <Tag>演示</Tag>}
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {fmt(e.eventTime)}
                          </Text>
                          {e.dept && (
                            <Tag color="blue" style={{ fontSize: 11 }}>
                              {e.dept}
                            </Tag>
                          )}
                        </div>
                        {e.detail && (
                          <div className="mt-1">
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              {e.detail}
                            </Text>
                          </div>
                        )}
                      </div>
                    ),
                  };
                })}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={7}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>事件类型分布</span>}
            style={{ borderTop: `3px solid ${JL.blue}` }}
          >
            {typeStats.length === 0 ? (
              <Empty description="暂无统计" />
            ) : (
              typeStats.map(([type, count]) => {
                const meta = metaOf(type);
                return (
                  <div
                    key={type}
                    className="flex items-center justify-between"
                    style={{ padding: '8px 0', borderBottom: '1px dashed #f0f0f0' }}
                  >
                    <span>
                      {meta.icon}
                      <Text style={{ marginLeft: 8, color: JL.navy }}>
                        {meta.label}
                      </Text>
                    </span>
                    <Tag color={meta.color}>{count} 条</Tag>
                  </div>
                );
              })
            )}
            <div className="mt-4">
              <Title level={5} style={{ color: JL.navy }}>
                跳转入口
              </Title>
              <Button
                type="link"
                style={{ paddingLeft: 0, color: JL.accent }}
                onClick={() => navigate(`/patients/360/${id ?? ''}`)}
              >
                前往患者 360 综合视图 →
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
