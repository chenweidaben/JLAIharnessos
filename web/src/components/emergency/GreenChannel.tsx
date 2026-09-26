/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 绿色通道：选择已分诊患者启动 / 逐节点记录时间 / DB·DCT·DNT 质控 / 关闭
 * 全部真实落库（/emergency/green-channels/*）。
 */
import { useEffect, useMemo, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Timeline,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  PlusCircleOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import clsx from 'clsx';

import { useEmergencyStore } from '@/store/emergencyStore';
import type {
  GreenChannelDto as GreenChannel,
  GreenChannelNodeDto,
  GreenChannelType,
} from '@/types/emergency';
import { GC_STATUS_META, GC_TYPE_META } from './constants';

const { TextArea } = Input;

/** 质控指标芯片 */
function QualityChip({ label, value, target }: { label: string; value?: number | null; target: number }) {
  if (value == null) {
    return (
      <div className="rounded-lg bg-gray-50 px-3 py-2 text-center">
        <div className="text-xs text-ink-secondary">{label}</div>
        <div className="text-sm font-semibold text-ink-secondary">待测</div>
      </div>
    );
  }
  const ok = value <= target;
  return (
    <div className={clsx('rounded-lg px-3 py-2 text-center', ok ? 'bg-medical-normal/10' : 'bg-medical-critical/10')}>
      <div className="text-xs text-ink-secondary">{label}</div>
      <div className={clsx('text-sm font-bold', ok ? 'text-medical-normal' : 'text-medical-critical')}>
        {value} min
        <span className="ml-1 text-xs font-normal text-ink-secondary">/ 目标{target}</span>
      </div>
    </div>
  );
}

export default function GreenChannelView() {
  const { message } = AntdApp.useApp();
  const {
    queue,
    channelTypes,
    greenChannels,
    acting,
    ready,
    fetchGreenChannels,
    fetchChannelTypes,
    startGreenChannel,
    recordNode,
    closeGreenChannel,
  } = useEmergencyStore();

  const [startOpen, setStartOpen] = useState(false);
  const [visitId, setVisitId] = useState<string>('');
  const [type, setType] = useState<GreenChannelType>('chest_pain');
  const [subtype, setSubtype] = useState<string>('');

  const [nodeTarget, setNodeTarget] = useState<{ channel: GreenChannel; node: GreenChannelNodeDto } | null>(null);
  const [nodeTime, setNodeTime] = useState<string>('');

  const [closing, setClosing] = useState<GreenChannel | null>(null);
  const [outcome, setOutcome] = useState('');
  const [qualityNote, setQualityNote] = useState('');

  useEffect(() => {
    void fetchGreenChannels();
    void fetchChannelTypes();
  }, [fetchGreenChannels, fetchChannelTypes]);

  /** 可启动通道的患者：已分诊、非终末、无活动通道 */
  const eligible = useMemo(
    () =>
      queue.filter(
        (q) =>
          !q.greenChannelActive &&
          ['triaged', 'in_treatment', 'resuscitation', 'observation'].includes(q.emStatus),
      ),
    [queue],
  );

  const subtypesOf = (t: GreenChannelType): string[] =>
    channelTypes.find((c) => c.type === t)?.subtypes ?? [];

  const openStart = () => {
    setVisitId(eligible[0]?.visitId ?? '');
    setType('chest_pain');
    setSubtype('');
    setStartOpen(true);
  };

  const handleStart = async () => {
    if (!visitId) {
      message.warning('请选择患者');
      return;
    }
    const sub = subtype || subtypesOf(type)[0] || '';
    await startGreenChannel(visitId, type, sub);
    message.success(`绿色通道已启动并通知：${GC_TYPE_META[type].teams.join('、')}`);
    setStartOpen(false);
  };

  const openNode = (channel: GreenChannel, node: GreenChannelNodeDto) => {
    setNodeTarget({ channel, node });
    setNodeTime(dayjs().format('YYYY-MM-DDTHH:mm'));
  };

  const handleNode = async () => {
    if (!nodeTarget) return;
    const iso = dayjs(nodeTime).format('YYYY-MM-DDTHH:mm:ss');
    await recordNode(nodeTarget.channel.id, nodeTarget.node.nodeKey, iso);
    message.success(`已记录：${nodeTarget.node.label}`);
    setNodeTarget(null);
  };

  const openClose = (gc: GreenChannel) => {
    setClosing(gc);
    setOutcome('');
    setQualityNote('');
  };

  const handleClose = async () => {
    if (!closing) return;
    await closeGreenChannel(closing.id, outcome || '完成救治，转专科', qualityNote || null);
    message.success('绿色通道已关闭，质控指标已计算');
    setClosing(null);
  };

  const activeCount = greenChannels.filter((g) => g.status === 'active').length;

  const renderCard = (gc: GreenChannel) => {
    const meta = GC_TYPE_META[gc.type];
    const active = gc.status === 'active';
    const statusMeta = GC_STATUS_META[gc.status];
    return (
      <Card
        key={gc.id}
        className="shadow-card"
        style={{ borderTop: `3px solid ${meta.color}`, opacity: active ? 1 : 0.8 }}
        title={
          <div className="flex flex-wrap items-center gap-2">
            <Tag color={meta.color} className="mr-0">
              {meta.label}
            </Tag>
            <span className="font-semibold text-ink-primary">{gc.channelNo}</span>
            {gc.subtype && <span className="text-xs text-ink-secondary">{gc.subtype}</span>}
          </div>
        }
        extra={
          <Tag color={statusMeta.color} icon={active ? <ClockCircleOutlined /> : <CheckCircleOutlined />}>
            {statusMeta.label}
          </Tag>
        }
      >
        {/* 质控指标 */}
        <Row gutter={[8, 8]} className="mb-3">
          <Col span={8}>
            <QualityChip label="D-to-B 入门-球囊" value={gc.dbnMinutes} target={90} />
          </Col>
          <Col span={8}>
            <QualityChip label="D-to-CT 入门-CT" value={gc.dctMinutes} target={25} />
          </Col>
          <Col span={8}>
            <QualityChip label="D-to-N 入门-溶栓" value={gc.dntMinutes} target={60} />
          </Col>
        </Row>

        {/* 时间轴 */}
        <Timeline
          items={gc.nodes.map((n) => {
            const done = n.actualTime != null;
            // arrive/activate 由系统自动记录；close 走“关闭通道”专用动作
            const isAuto =
              n.nodeKey === 'arrive' ||
              n.nodeKey === 'activate' ||
              n.nodeKey === 'close';
            return {
              color: n.overdue ? 'red' : done ? 'green' : 'gray',
              dot: n.overdue ? <CloseCircleOutlined style={{ color: '#F5222D' }} /> : undefined,
              children: (
                <div className="flex items-center justify-between gap-2">
                  <span className={clsx(!done && 'text-ink-secondary')}>
                    {n.label}
                    {!done && n.targetMinutes != null && (
                      <span className="ml-1 text-xs text-ink-secondary">（目标 {n.targetMinutes} 分钟）</span>
                    )}
                  </span>
                  <Space size={4}>
                    <span className={clsx('text-sm font-semibold', n.overdue ? 'text-medical-critical' : 'text-ink-primary')}>
                      {done ? dayjs(n.actualTime).format('HH:mm') : '未完成'}
                      {n.overdue && <span className="ml-1 text-xs">超时!</span>}
                    </span>
                    {active && !done && !isAuto && (
                      <Button size="small" type="link" onClick={() => openNode(gc, n)}>
                        记录
                      </Button>
                    )}
                  </Space>
                </div>
              ),
            };
          })}
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-ink-border pt-2 text-xs text-ink-secondary">
          <span className="flex items-center gap-1">
            <TeamOutlined /> 已通知：{gc.notifiedTeams.join('、')}
          </span>
          {active && (
            <Button size="small" danger onClick={() => openClose(gc)}>
              关闭通道
            </Button>
          )}
        </div>

        {!active && (
          <div className="mt-1 text-xs text-ink-secondary">
            {gc.outcome && <span>转归：{gc.outcome}</span>}
            {gc.qualityNote && (
              <span className="ml-2 flex items-center gap-1 text-medical-normal">
                <SafetyCertificateOutlined /> {gc.qualityNote}
              </span>
            )}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-ink-secondary">
          绿色通道 <b className="text-medical-critical">{activeCount}</b> 条激活中 · 共{' '}
          {greenChannels.length} 条
        </div>
        <Button type="primary" icon={<PlusCircleOutlined />} onClick={openStart} disabled={ready === false}>
          启动绿色通道
        </Button>
      </div>

      {greenChannels.length === 0 && <Empty description="暂无绿色通道" />}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{greenChannels.map(renderCard)}</div>

      {/* 启动通道 */}
      <Modal open={startOpen} title="启动绿色通道" onOk={handleStart} confirmLoading={acting} onCancel={() => setStartOpen(false)} okText="启动并通知团队">
        <div className="mt-2 space-y-3">
          <div>
            <div className="mb-1 text-xs text-ink-secondary">选择患者（须先完成分诊分级）</div>
            <Select
              className="w-full"
              value={visitId || undefined}
              placeholder="选择已分诊患者"
              onChange={setVisitId}
              options={eligible.map((q) => ({
                value: q.visitId,
                label: `${q.triageNo} ${q.patientName} · ${q.chiefComplaint ?? ''}`,
              }))}
              notFoundContent="暂无可启动通道的患者，请先在分诊台完成分级"
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-ink-secondary">通道类型</div>
            <Select
              className="w-full"
              value={type}
              onChange={(t) => {
                setType(t);
                setSubtype('');
              }}
              options={(Object.keys(GC_TYPE_META) as GreenChannelType[]).map((t) => ({
                value: t,
                label: GC_TYPE_META[t].label,
              }))}
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-ink-secondary">亚型/具体情形</div>
            <Select
              className="w-full"
              value={subtype || undefined}
              onChange={setSubtype}
              placeholder="选择亚型"
              options={subtypesOf(type).map((s) => ({ value: s, label: s }))}
            />
          </div>
        </div>
      </Modal>

      {/* 记录节点时间 */}
      <Modal open={!!nodeTarget} title={`记录时间 · ${nodeTarget?.node.label}`} onOk={handleNode} confirmLoading={acting} onCancel={() => setNodeTarget(null)} okText="保存">
        <div className="mt-2">
          <div className="mb-1 text-xs text-ink-secondary">实际完成时间</div>
          <Input
            type="datetime-local"
            value={nodeTime}
            onChange={(e) => setNodeTime(e.target.value)}
          />
          {nodeTarget?.node.targetMinutes != null && (
            <div className="mt-2 text-xs text-ink-secondary">
              目标：通道激活后 {nodeTarget.node.targetMinutes} 分钟内
            </div>
          )}
        </div>
      </Modal>

      {/* 关闭通道 */}
      <Modal open={!!closing} title={`关闭绿色通道 · ${closing?.channelNo ?? ''}`} onOk={handleClose} confirmLoading={acting} onCancel={() => setClosing(null)} okText="确认关闭">
        <div className="mt-2 space-y-3">
          <div>
            <div className="text-xs text-ink-secondary">转归</div>
            <Input value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="如：急诊PCI成功，转CCU" />
          </div>
          <div>
            <div className="text-xs text-ink-secondary">质量评估（可选）</div>
            <TextArea rows={2} value={qualityNote} onChange={(e) => setQualityNote(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
