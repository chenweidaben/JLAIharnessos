/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 急诊档案（只读汇总）：把同一就诊的真实分诊 / 绿色通道 / 抢救 / 留观 / 转归
 * 记录聚合呈现。
 *
 * 范围说明：M1-B1 后端未提供“独立急诊病历撰写 / AI 生成病历 / 电子签名归档”端点，
 * 故本页不提供这些写操作，也不以假数据填充；仅做真实记录的只读汇总，可打印。
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Row,
  Select,
  Space,
  Tag,
  Timeline,
} from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { useEmergencyStore } from '@/store/emergencyStore';
import {
  DISPOSITION_META,
  EM_STATUS_META,
  GC_TYPE_META,
  NURSING_LEVEL_META,
  RESUS_EVENT_TYPE_META,
  TRIAGE_LEVEL_META,
} from './constants';

function num(v: unknown): string {
  return typeof v === 'number' ? String(v) : '--';
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 border-l-4 border-jl-primary pl-2 text-sm font-semibold text-ink-primary">
        {title}
      </div>
      <div className="text-sm leading-relaxed text-ink-primary">{children}</div>
    </div>
  );
}

export default function EmergencyRecordView() {
  const {
    queue,
    greenChannels,
    resuscitations,
    observations,
    fetchQueue,
    fetchGreenChannels,
    fetchResuscitations,
    fetchObservations,
  } = useEmergencyStore();

  const [visitId, setVisitId] = useState<string>('');

  useEffect(() => {
    void fetchQueue();
    void fetchGreenChannels();
    void fetchResuscitations();
    void fetchObservations();
  }, [fetchQueue, fetchGreenChannels, fetchResuscitations, fetchObservations]);

  useEffect(() => {
    if (!visitId && queue.length) setVisitId(queue[0].visitId);
  }, [queue, visitId]);

  const item = useMemo(() => queue.find((q) => q.visitId === visitId), [queue, visitId]);
  const gc = useMemo(
    () => greenChannels.find((g) => g.visitId === visitId),
    [greenChannels, visitId],
  );
  const resus = useMemo(
    () => resuscitations.find((r) => r.visitId === visitId),
    [resuscitations, visitId],
  );
  const obs = useMemo(
    () => observations.find((o) => o.visitId === visitId),
    [observations, visitId],
  );

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <Row gutter={[12, 12]} align="middle">
          <Col flex="auto">
            <Space>
              <span className="text-sm text-ink-secondary">选择就诊：</span>
              <Select
                showSearch
                className="min-w-[320px]"
                value={visitId || undefined}
                onChange={setVisitId}
                optionFilterProp="label"
                options={queue.map((q) => ({
                  value: q.visitId,
                  label: `${q.triageNo} ${q.patientName} · ${q.chiefComplaint ?? ''}`,
                }))}
              />
            </Space>
          </Col>
          <Col>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              打印
            </Button>
          </Col>
        </Row>
      </Card>

      <Alert
        type="info"
        showIcon
        message="本页为真实急诊记录的只读汇总；独立病历撰写、AI 生成病历与电子签名归档不在 M1-B1 范围。"
      />

      {!item ? (
        <Card className="shadow-card">
          <Empty description="请选择就诊记录" />
        </Card>
      ) : (
        <Card className="shadow-card" styles={{ body: { padding: 28 } }}>
          <div className="mx-auto max-w-3xl space-y-4">
            {/* 抬头 */}
            <div>
              <h2 className="text-center text-xl font-bold">急诊档案</h2>
              <div className="text-center text-xs text-ink-secondary">
                健澜科技数智医院 · 急诊科
              </div>
            </div>
            <Divider style={{ margin: '8px 0' }} />

            <Row justify="space-between" align="middle">
              <Col>
                <Space wrap>
                  <b className="text-jl-primary">{item.triageNo}</b>
                  <span className="font-semibold">{item.patientName}</span>
                  <span className="text-xs text-ink-secondary">
                    {item.gender === 'male' ? '男' : '女'} · {item.age}
                  </span>
                </Space>
              </Col>
              <Col>
                <Space size={4}>
                  {item.level != null && (
                    <Tag color={TRIAGE_LEVEL_META[(item.level as 1 | 2 | 3 | 4)]?.color}>
                      {TRIAGE_LEVEL_META[(item.level as 1 | 2 | 3 | 4)]?.label}
                    </Tag>
                  )}
                  <Tag color={EM_STATUS_META[item.emStatus].color}>
                    {EM_STATUS_META[item.emStatus].label}
                  </Tag>
                </Space>
              </Col>
            </Row>

            <Section title="主诉">{item.chiefComplaint ?? '—'}</Section>

            {/* 分诊记录 */}
            <Section title="分诊记录">
              <div className="mb-1 text-xs text-ink-secondary">
                T {num(item.vitals.temperature)}℃ · P {num(item.vitals.pulse)} · R{' '}
                {num(item.vitals.respiration)} · BP {num(item.vitals.systolic)}/
                {num(item.vitals.diastolic)} mmHg · SpO₂ {num(item.vitals.spo2)}%
              </div>
              <Space wrap size={4}>
                {item.newsScore != null && <Tag>NEWS2 {item.newsScore}</Tag>}
                {item.gcsTotal != null && <Tag>GCS {item.gcsTotal}</Tag>}
                {Boolean(item.vitals.consciousness) && (
                  <Tag>意识 {String(item.vitals.consciousness)}</Tag>
                )}
              </Space>
              {item.vitals.basis != null && (
                <div className="mt-1 text-xs text-ink-secondary">
                  判定依据：{String(item.vitals.basis)}
                </div>
              )}
            </Section>

            {/* 绿色通道 */}
            {gc && (
              <Section
                title={`绿色通道 · ${GC_TYPE_META[gc.type].label}${gc.subtype ? `（${gc.subtype}）` : ''}`}
              >
                <Space wrap className="mb-2">
                  {gc.dbnMinutes != null && (
                    <Tag color={gc.dbnMinutes <= 90 ? 'success' : 'error'}>D-B {gc.dbnMinutes}′</Tag>
                  )}
                  {gc.dctMinutes != null && (
                    <Tag color={gc.dctMinutes <= 25 ? 'success' : 'error'}>D-CT {gc.dctMinutes}′</Tag>
                  )}
                  {gc.dntMinutes != null && (
                    <Tag color={gc.dntMinutes <= 60 ? 'success' : 'error'}>D-N {gc.dntMinutes}′</Tag>
                  )}
                </Space>
                <Timeline
                  items={gc.nodes.map((n) => ({
                    color: n.overdue ? 'red' : n.actualTime ? 'green' : 'gray',
                    children: (
                      <span className="text-xs">
                        {n.label}：
                        {n.actualTime ? dayjs(n.actualTime).format('HH:mm') : '未完成'}
                      </span>
                    ),
                  }))}
                />
              </Section>
            )}

            {/* 抢救记录 */}
            {resus && (
              <Section title={`抢救记录 · ${resus.bedNo ?? ''}`}>
                <div className="mb-1">{resus.diagnosis ?? '诊断待明确'}</div>
                {resus.medications.length > 0 && (
                  <div className="mb-1 text-xs">
                    用药：
                    {resus.medications
                      .map((m) => `${m.name} ${m.dose}`)
                      .join('；')}
                  </div>
                )}
                <Timeline
                  items={resus.events.map((e) => ({
                    color: RESUS_EVENT_TYPE_META[e.type]?.color ?? 'gray',
                    children: (
                      <span className="text-xs">
                        {dayjs(e.time).format('HH:mm')} {e.content}
                      </span>
                    ),
                  }))}
                />
              </Section>
            )}

            {/* 留观记录 */}
            {obs && (
              <Section title="留观记录">
                <Space wrap size={4}>
                  <Tag>{NURSING_LEVEL_META[obs.nursingLevel]?.label ?? `${obs.nursingLevel}护理`}</Tag>
                  <Tag color={obs.status === 'worsening' ? 'error' : 'default'}>
                    {obs.status}
                  </Tag>
                  {obs.ivStatus && <Tag color="blue">{obs.ivStatus}</Tag>}
                </Space>
                {obs.pendingTasks.filter((t) => !t.done).length > 0 && (
                  <div className="mt-1 text-xs text-ink-secondary">
                    待办：
                    {obs.pendingTasks
                      .filter((t) => !t.done)
                      .map((t) => t.content)
                      .join('；')}
                  </div>
                )}
              </Section>
            )}

            {/* 转归 */}
            <Section title="转归">
              <Tag color={EM_STATUS_META[item.emStatus].color}>
                {DISPOSITION_META[item.emStatus as keyof typeof DISPOSITION_META]?.label ??
                  EM_STATUS_META[item.emStatus].label}
              </Tag>
              <span className="ml-1 text-xs text-ink-secondary">
                到达 {dayjs(item.arriveTime).format('MM-DD HH:mm')}
                {item.triageTime && ` · 分诊 ${dayjs(item.triageTime).format('HH:mm')}`}
              </span>
            </Section>
          </div>
        </Card>
      )}
    </div>
  );
}
