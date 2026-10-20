/**
 * 健澜科技 jlmedaios - 患者360综合时间线视图页
 *
 * 顶部患者概要卡 + 中部按时间倒序合并的临床事件时间线
 * （入院 / 病情变化 / 医嘱下达 / 检验结果 / 病历书写 / 费用发生）
 * + 右侧关键指标卡（住院天数 / 累计费用 / 未审医嘱数）。
 * 深海蓝 VI：主色 #0A2540 / 辅色 #1E5F8C / 强调 #4A90D9。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
  Spin,
  Statistic,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import { ArrowLeftOutlined, NodeIndexOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import { usePatient360Store } from '@/store/patient360Store';
import type { TimelineCategory } from '@/services/api/patient360';

const { Text, Title } = Typography;

/** 深海蓝 VI 色板（与 detail.tsx / styles/index.css 保持一致） */
const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
} as const;

const CATEGORY_META: Record<TimelineCategory, { label: string; color: string }> = {
  admission: { label: '入院', color: JL.accent },
  condition: { label: '病情变化', color: '#722ed1' },
  order: { label: '医嘱', color: JL.blue },
  lab: { label: '检验', color: '#389e0d' },
  document: { label: '病历', color: '#08979c' },
  cost: { label: '费用', color: '#d46b08' },
};

const fmt = (t: string) => dayjs(t).format('MM-DD HH:mm');

export default function Patient360TimelinePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  usePageTitle('患者360综合时间线');

  const { view, loading, error, setPatientId, load } = usePatient360Store();

  useEffect(() => {
    if (!id) return;
    setPatientId(id);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading && !view) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载患者360时间线…" />
      </div>
    );
  }

  if (error && !view) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Empty description={error} />
        <Button onClick={() => void load()}>重试</Button>
      </div>
    );
  }

  const summary = view?.summary;
  const metrics = view?.metrics;
  const events = view?.events ?? [];

  return (
    <PageContainer
      title="患者360综合时间线"
      description={summary?.diagnosis}
      extra={
        <div className="flex gap-2">
          <Button
            icon={<NodeIndexOutlined />}
            onClick={() => navigate(`/patient/${id ?? ''}/timeline`)}
          >
            统一时间线（M470）
          </Button>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/patients')}>
            返回列表
          </Button>
        </div>
      }
    >
      {error && <Alert type="warning" showIcon style={{ marginBottom: 16 }} message={error} />}

      <Row gutter={[16, 16]}>
        {/* ------------------------------ 左列：概要 + 时间线 ------------------------------ */}
        <Col xs={24} xl={17}>
          {/* 患者概要卡 */}
          <Card className="mb-4" style={{ borderTop: `3px solid ${JL.navy}` }}>
            <Row align="middle" gutter={16}>
              <Col flex="auto">
                <div className="flex items-center gap-3">
                  <Title level={3} style={{ color: JL.navy, margin: 0 }}>
                    {summary?.name ?? '—'}
                  </Title>
                  <Tag color={summary?.inHospital ? 'processing' : 'default'} style={{ fontSize: 13, padding: '2px 10px' }}>
                    {summary?.inHospital ? '在院' : '出院'}
                  </Tag>
                  {summary?.bedNo && <Tag color="blue">床号 {summary.bedNo}</Tag>}
                </div>
                <Descriptions
                  className="mt-3"
                  size="small"
                  column={{ xs: 1, sm: 2, md: 3 }}
                  items={[
                    { key: 'gender', label: '性别', children: summary?.genderText ?? '—' },
                    { key: 'age', label: '年龄', children: summary ? `${summary.age} 岁` : '—' },
                    { key: 'dept', label: '科室', children: summary?.deptName ?? '—' },
                    { key: 'patientNo', label: '住院号', children: summary?.patientNo ?? '—' },
                    { key: 'encounterNo', label: '就诊号', children: summary?.encounterNo ?? '—' },
                    { key: 'diagnosis', label: '诊断', children: summary?.diagnosis ?? '—' },
                  ]}
                />
              </Col>
            </Row>
          </Card>

          {/* 合并时间线 */}
          <Card
            title={
              <span style={{ color: JL.navy, fontWeight: 600 }}>
                临床事件时间线
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12, fontWeight: 400 }}>
                  按时间倒序合并
                </Text>
              </span>
            }
            extra={
              <div className="flex gap-2">
                {(Object.keys(CATEGORY_META) as TimelineCategory[]).map((c) => (
                  <Tag key={c} color={CATEGORY_META[c].color} style={{ marginInlineEnd: 0 }}>
                    {CATEGORY_META[c].label}
                  </Tag>
                ))}
              </div>
            }
          >
            {events.length === 0 ? (
              <Empty description="暂无临床事件" />
            ) : (
              <Timeline
                items={events.map((e) => ({
                  color: CATEGORY_META[e.category].color,
                  children: (
                    <div className="mb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Tag color={CATEGORY_META[e.category].color}>{CATEGORY_META[e.category].label}</Tag>
                        <Text strong style={{ color: JL.navy }}>
                          {e.title}
                        </Text>
                        {e.demo && <Tag color="default">演示</Tag>}
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {fmt(e.time)}
                        </Text>
                            {e.meta && (
                          <Text strong style={{ color: e.category === 'cost' ? '#d46b08' : JL.blue, fontSize: 12 }}>
                            {e.meta}
                          </Text>
                        )}
                      </div>
                      {e.description && (
                        <div className="mt-1">
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            {e.description}
                          </Text>
                        </div>
                      )}
                      {e.author && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            经办人：{e.author}
                          </Text>
                        </div>
                      )}
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </Col>

        {/* ------------------------------ 右列：关键指标 ------------------------------ */}
        <Col xs={24} xl={7}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>关键指标</span>}
            style={{ borderTop: `3px solid ${JL.blue}` }}
          >
            <Statistic
              title={
                <span>
                  住院天数
                  {metrics?.hospitalDaysDemo && <Tag style={{ marginLeft: 6 }}>演示</Tag>}
                </span>
              }
              value={metrics?.hospitalDays ?? 0}
              suffix="天"
              valueStyle={{ color: JL.navy }}
            />
            <div className="my-4" style={{ borderTop: '1px dashed #e8e8e8' }} />
            <Statistic
              title={
                <span>
                  累计费用
                  {metrics?.totalCostDemo && <Tag style={{ marginLeft: 6 }}>演示估值</Tag>}
                </span>
              }
              value={metrics?.totalCost ?? 0}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#d46b08' }}
            />
            <div className="my-4" style={{ borderTop: '1px dashed #e8e8e8' }} />
            <Statistic
              title="未审医嘱数"
              value={metrics?.pendingOrders ?? 0}
              suffix="条"
              valueStyle={{ color: (metrics?.pendingOrders ?? 0) > 0 ? '#cf1322' : JL.navy }}
            />
            <div className="mt-4">
              <Text type="secondary" style={{ fontSize: 12 }}>
                标记「演示」的行/指标为前端按聚合缺口补齐的确定性示例数据，待 BFF 对应明细端点接入后自动替换。
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
