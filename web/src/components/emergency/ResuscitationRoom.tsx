/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 抢救室：活动抢救床位卡 / 事件·用药 / 生命体征趋势 / 启动·结束（真实 BFF）
 * 说明：后端无“固定床位+设备状态”模型，故仅渲染真实抢救记录，不虚构空床/设备。
 */
import { useEffect, useMemo, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Timeline,
} from 'antd';
import {
  ClockCircleOutlined,
  ExperimentOutlined,
  MedicineBoxOutlined,
  PlusCircleOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { LineChart } from '@/components/charts';
import { useEmergencyStore } from '@/store/emergencyStore';
import type { ResuscitationDto } from '@/types/emergency';
import { RESUS_EVENT_TYPE_META, RESUS_RECORD_STATUS_META } from './constants';

function nowLocal() {
  return dayjs().format('YYYY-MM-DDTHH:mm');
}

export default function ResuscitationRoom() {
  const { message } = AntdApp.useApp();
  const {
    queue,
    resuscitations,
    acting,
    ready,
    fetchResuscitations,
    fetchQueue,
    startResuscitation,
    addResusEvent,
    addResusMedication,
    completeResuscitation,
  } = useEmergencyStore();

  const [active, setActive] = useState<ResuscitationDto | null>(null);

  const [startOpen, setStartOpen] = useState(false);
  const [startForm] = Form.useForm();

  const [eventOpen, setEventOpen] = useState(false);
  const [eventForm] = Form.useForm();

  const [medOpen, setMedOpen] = useState(false);
  const [medForm] = Form.useForm();

  const [doneOpen, setDoneOpen] = useState(false);
  const [doneForm] = Form.useForm();

  useEffect(() => {
    void fetchResuscitations();
    void fetchQueue();
  }, [fetchResuscitations, fetchQueue]);

  /** visitId → 队列条目（取姓名/年龄/性别） */
  const qByVisit = useMemo(() => new Map(queue.map((q) => [q.visitId, q])), [queue]);

  /** 可启动抢救：已分诊/救治中/留观、非终末 */
  const eligible = useMemo(
    () =>
      queue.filter((q) =>
        ['triaged', 'in_treatment', 'observation'].includes(q.emStatus),
      ),
    [queue],
  );

  const openStart = () => {
    startForm.resetFields();
    startForm.setFieldsValue({ visitId: eligible[0]?.visitId });
    setStartOpen(true);
  };

  const handleStart = async () => {
    const v = await startForm.validateFields();
    await startResuscitation(v.visitId, v.bedNo || undefined, v.diagnosis || undefined);
    message.success('抢救已启动，抢救团队已召集');
    setStartOpen(false);
  };

  const openEvent = () => {
    eventForm.resetFields();
    eventForm.setFieldsValue({ type: 'vitals', time: nowLocal() });
    setEventOpen(true);
  };

  const handleEvent = async () => {
    if (!active) return;
    const v = await eventForm.validateFields();
    await addResusEvent(active.id, {
      time: dayjs(v.time).format('YYYY-MM-DDTHH:mm:ss'),
      type: v.type,
      content: v.content,
    });
    message.success('抢救事件已记录');
    setEventOpen(false);
  };

  const openMed = () => {
    medForm.resetFields();
    medForm.setFieldsValue({ route: '静注', time: nowLocal() });
    setMedOpen(true);
  };

  const handleMed = async () => {
    if (!active) return;
    const v = await medForm.validateFields();
    await addResusMedication(active.id, {
      name: v.name,
      dose: v.dose,
      route: v.route,
      time: dayjs(v.time).format('YYYY-MM-DDTHH:mm:ss'),
    });
    message.success('用药已记录');
    setMedOpen(false);
  };

  const openDone = () => {
    doneForm.resetFields();
    doneForm.setFieldsValue({ status: 'stabilized' });
    setDoneOpen(true);
  };

  const handleDone = async () => {
    if (!active) return;
    const v = await doneForm.validateFields();
    await completeResuscitation(active.id, {
      status: v.status,
      outcome: v.outcome,
      summary: v.summary || null,
    });
    message.success('抢救结束，记录已归档');
    setDoneOpen(false);
    setActive(null);
  };

  const trend = useMemo(() => {
    if (!active)
      return {
        xData: [] as string[],
        series: [] as { name: string; data: (number | null)[] }[],
      };
    return {
      xData: active.vitalTrend.map((v) => dayjs(v.time).format('HH:mm')),
      series: [
        { name: '心率', data: active.vitalTrend.map((v) => v.pulse ?? v.hr ?? null) },
        { name: '收缩压', data: active.vitalTrend.map((v) => v.systolic ?? v.bp_s ?? null) },
        { name: 'SpO₂', data: active.vitalTrend.map((v) => v.spo2 ?? null) },
      ],
    };
  }, [active]);

  return (
    <div className="space-y-4">
      <Row gutter={[12, 12]}>
        <Col xs={12} md={8}>
          <Card className="shadow-card">
            <div className="text-xs text-ink-secondary">抢救中</div>
            <div className="text-2xl font-semibold text-medical-critical">{resuscitations.length}</div>
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card className="shadow-card">
            <div className="text-xs text-ink-secondary">累计抢救事件</div>
            <div className="text-2xl font-semibold text-ink-primary">
              {resuscitations.reduce((n, r) => n + r.events.length, 0)}
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8} className="flex items-end justify-end">
          <Button type="primary" icon={<PlusCircleOutlined />} onClick={openStart} disabled={ready === false}>
            启动抢救
          </Button>
        </Col>
      </Row>

      {resuscitations.length === 0 ? (
        <Empty description="当前无活动抢救记录" />
      ) : (
        <Row gutter={[12, 12]}>
          {resuscitations.map((r) => {
            const q = qByVisit.get(r.visitId);
            const meta = RESUS_RECORD_STATUS_META[r.status];
            const duration = dayjs().diff(dayjs(r.startTime), 'minute');
            return (
              <Col xs={24} sm={12} xl={8} key={r.id}>
                <Card
                  className="shadow-card cursor-pointer"
                  style={{ borderLeft: `4px solid ${meta.color}` }}
                  onClick={() => setActive(r)}
                  title={
                    <Space>
                      <ThunderboltOutlined style={{ color: meta.color }} />
                      <b>{r.bedNo ?? '抢救床'}</b>
                      <Tag color={meta.color} className="mr-0">
                        {meta.label}
                      </Tag>
                    </Space>
                  }
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-ink-primary">{q?.patientName ?? '—'}</span>
                    {q && (
                      <span className="text-xs text-ink-secondary">
                        {q.gender} · {q.age}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 truncate text-xs text-ink-secondary">{r.diagnosis ?? '诊断待明确'}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    <ClockCircleOutlined /> 已抢救 <b style={{ color: meta.color }}>{duration}</b> 分钟
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1 text-xs text-ink-secondary">
                    <span>事件 {r.events.length}</span> · <span>用药 {r.medications.length}</span>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* 抢救记录抽屉 */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        width={660}
        title={
          <Space>
            <span>{active?.bedNo ?? '抢救床'} · 抢救记录</span>
            {active && <Tag color={RESUS_RECORD_STATUS_META[active.status].color}>{RESUS_RECORD_STATUS_META[active.status].label}</Tag>}
          </Space>
        }
        extra={
          active?.status === 'resuscitating' ? (
            <Space>
              <Button size="small" onClick={openEvent}>记事件</Button>
              <Button size="small" onClick={openMed}>记用药</Button>
              <Button size="small" danger onClick={openDone}>结束抢救</Button>
            </Space>
          ) : undefined
        }
      >
        {active && (
          <div className="space-y-4">
            <div className="rounded-lg bg-jl-primary/5 p-3 text-sm">
              <div><b>诊断：</b>{active.diagnosis ?? '—'}</div>
              <div><b>开始：</b>{dayjs(active.startTime).format('MM-DD HH:mm')}</div>
              {active.outcome && <div><b>转归：</b>{active.outcome}</div>}
            </div>

            {active.team.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1 text-sm font-semibold">
                  <TeamOutlined /> 抢救团队
                </div>
                <div className="flex flex-wrap gap-2">
                  {active.team.map((m, i) => (
                    <Tag key={i} color="blue">
                      {m}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {active.vitalTrend.length > 0 && (
              <div>
                <div className="mb-2 text-sm font-semibold">生命体征趋势</div>
                <LineChart xData={trend.xData} series={trend.series} height={220} />
              </div>
            )}

            {active.medications.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1 text-sm font-semibold">
                  <MedicineBoxOutlined /> 用药记录
                </div>
                <div className="space-y-1">
                  {active.medications.map((m, i) => (
                    <div key={i} className="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5 text-xs">
                      <span className="font-semibold text-purple-600">{m.name}</span>
                      <span>{m.dose}{m.route ? ` · ${m.route}` : ''}</span>
                      <span className="text-ink-secondary">{dayjs(m.time).format('HH:mm')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center gap-1 text-sm font-semibold">
                <ExperimentOutlined /> 抢救时间轴
              </div>
              <Timeline
                items={active.events.map((e) => ({
                  color: RESUS_EVENT_TYPE_META[e.type]?.color ?? 'gray',
                  children: (
                    <div>
                      <div className="text-xs text-ink-secondary">{dayjs(e.time).format('HH:mm')}</div>
                      <div className="text-sm text-ink-primary">{e.content}</div>
                    </div>
                  ),
                }))}
              />
            </div>

            {active.summary && <div className="rounded-lg bg-gray-50 p-3 text-xs text-ink-secondary">{active.summary}</div>}
          </div>
        )}
      </Drawer>

      {/* 启动抢救 */}
      <Modal open={startOpen} title="启动抢救" onOk={handleStart} confirmLoading={acting} onCancel={() => setStartOpen(false)} okText="启动并召集团队">
        <Form form={startForm} layout="vertical" className="mt-2">
          <Form.Item name="visitId" label="选择患者" rules={[{ required: true }]}>
            <Select
              options={eligible.map((q) => ({ value: q.visitId, label: `${q.triageNo} ${q.patientName} · ${q.chiefComplaint ?? ''}` }))}
              notFoundContent="暂无可启动抢救的患者，请先完成分诊"
            />
          </Form.Item>
          <Form.Item name="bedNo" label="抢救床位">
            <Input placeholder="如：抢救1床" />
          </Form.Item>
          <Form.Item name="diagnosis" label="初步诊断">
            <Input placeholder="如：心搏骤停、休克、严重创伤" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 记录事件 */}
      <Modal open={eventOpen} title="记录抢救事件" onOk={handleEvent} confirmLoading={acting} onCancel={() => setEventOpen(false)}>
        <Form form={eventForm} layout="vertical" className="mt-2">
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select options={Object.entries(RESUS_EVENT_TYPE_META).map(([k, v]) => ({ value: k, label: v.label }))} />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入事件内容' }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="time" label="时间">
            <Input type="datetime-local" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 记录用药 */}
      <Modal open={medOpen} title="记录抢救用药" onOk={handleMed} confirmLoading={acting} onCancel={() => setMedOpen(false)}>
        <Form form={medForm} layout="vertical" className="mt-2">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="name" label="药品" rules={[{ required: true }]}>
                <Input placeholder="如：肾上腺素" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dose" label="剂量" rules={[{ required: true }]}>
                <Input placeholder="如：1mg" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="route" label="途径">
                <Input placeholder="静注/静滴" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="time" label="时间">
                <Input type="datetime-local" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 结束抢救 */}
      <Modal open={doneOpen} title="结束抢救" onOk={handleDone} confirmLoading={acting} onCancel={() => setDoneOpen(false)} okText="结束并归档">
        <Form form={doneForm} layout="vertical" className="mt-2">
          <Form.Item name="status" label="结束状态" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'stabilized', label: '病情稳定（转留观/专科）' },
                { value: 'transferred_icu', label: '转 ICU' },
                { value: 'deceased', label: '死亡' },
              ]}
            />
          </Form.Item>
          <Form.Item name="outcome" label="转归说明" rules={[{ required: true, message: '请填写转归' }]}>
            <Input placeholder="如：ROSC，生命体征趋稳，转留观" />
          </Form.Item>
          <Form.Item name="summary" label="抢救小结（可选）">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
