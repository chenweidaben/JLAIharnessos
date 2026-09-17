/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 绿色通道：胸痛/卒中/创伤/孕产妇/新生儿 — 一键启动 / 时间轴 / 质量指标
 */
import { useState } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Modal,
  Row,
  Space,
  Tag,
  Timeline,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  FastForwardOutlined,
  PlayCircleOutlined,
  PlusCircleOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import clsx from 'clsx';

import { useEmergencyStore } from '@/store/emergencyStore';
import type { GreenChannel, GreenChannelType } from '@/types/emergency';
import { GC_TYPE_META } from './constants';

const { TextArea } = Input;

/** 质量指标芯片 */
function QualityChip({
  label,
  value,
  target,
  unit = 'min',
}: {
  label: string;
  value?: number;
  target: number;
  unit?: string;
}) {
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
    <div
      className={clsx(
        'rounded-lg px-3 py-2 text-center',
        ok ? 'bg-medical-normal/10' : 'bg-medical-critical/10',
      )}
    >
      <div className="text-xs text-ink-secondary">{label}</div>
      <div
        className={clsx('text-sm font-bold', ok ? 'text-medical-normal' : 'text-medical-critical')}
      >
        {value} {unit}
        <span className="ml-1 text-xs font-normal text-ink-secondary">/ 目标{target}</span>
      </div>
    </div>
  );
}

function ChannelCard({ gc, onClose }: { gc: GreenChannel; onClose: (g: GreenChannel) => void }) {
  const meta = GC_TYPE_META[gc.type];
  const active = gc.status === 'active';
  return (
    <Card
      className="shadow-card"
      style={{ borderTop: `3px solid ${meta.color}`, opacity: active ? 1 : 0.75 }}
      title={
        <div className="flex items-center gap-2">
          <Tag color={meta.color} className="mr-0">
            {meta.label}
          </Tag>
          <span className="font-semibold text-ink-primary">{gc.patientName}</span>
          <span className="text-xs text-ink-secondary">{gc.subtype}</span>
        </div>
      }
      extra={
        <Space>
          {active ? (
            <Tag color="processing" icon={<FastForwardOutlined />}>
              激活中
            </Tag>
          ) : (
            <Tag icon={<CheckCircleOutlined />}>已完成</Tag>
          )}
          {active && (
            <Button size="small" danger onClick={() => onClose(gc)}>
              关闭通道
            </Button>
          )}
        </Space>
      }
    >
      {/* 质量指标 */}
      <Row gutter={[8, 8]} className="mb-3">
        <Col span={8}>
          <QualityChip label="D-to-B 入门-球囊" value={gc.dbnMinutes} target={90} />
        </Col>
        <Col span={8}>
          <QualityChip label="D-to-CT 入门-CT" value={gc.dctMinutes} target={25} />
        </Col>
        <Col span={8}>
          <QualityChip label="D-to-needle 溶栓" value={gc.dntMinutes} target={60} />
        </Col>
      </Row>

      {/* 时间轴 */}
      <Timeline
        items={gc.nodes.map((n) => ({
          color: n.overdue ? 'red' : n.done ? 'green' : 'gray',
          dot: n.overdue ? <CloseCircleOutlined style={{ color: '#F5222D' }} /> : undefined,
          children: (
            <div className="flex items-center justify-between">
              <span className={clsx(!n.done && 'text-ink-secondary')}>
                {n.label}
                {!n.done && n.targetMinutes != null && (
                  <span className="ml-1 text-xs text-ink-secondary">
                    （目标 {n.targetMinutes} 分钟）
                  </span>
                )}
              </span>
              <span
                className={clsx(
                  'text-sm font-semibold',
                  n.overdue ? 'animate-pulse-slow text-medical-critical' : 'text-ink-primary',
                )}
              >
                {n.time ?? '未完成'}
                {n.overdue && <span className="ml-1 text-xs">超时!</span>}
              </span>
            </div>
          ),
        }))}
      />

      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-ink-border pt-2 text-xs text-ink-secondary">
        <TeamOutlined /> 已通知：{gc.notifiedTeams.join('、')}
        {gc.outcome && <span className="ml-2">· 转归：{gc.outcome}</span>}
        {gc.qualityNote && (
          <span className="ml-2 flex items-center gap-1 text-medical-normal">
            <SafetyCertificateOutlined /> {gc.qualityNote}
          </span>
        )}
      </div>
    </Card>
  );
}

export default function GreenChannel() {
  const { message } = AntdApp.useApp();
  const { greenChannels, triageQueue, activateGreenChannel, closeGreenChannel } =
    useEmergencyStore();

  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState<GreenChannel | null>(null);
  const [outcome, setOutcome] = useState('');
  const [qualityNote, setQualityNote] = useState('');

  const handleActivate = async (type: GreenChannelType) => {
    const candidate =
      triageQueue.find((p) => p.status === 'waiting_triage') ??
      [...triageQueue].sort((a, b) => (a.level ?? 9) - (b.level ?? 9))[0];
    if (!candidate) {
      message.warning('暂无可激活的候诊患者');
      return;
    }
    const gc = await activateGreenChannel(candidate.id, type);
    setOpen(false);
    if (gc) {
      message.success(`已为 ${candidate.name} 启动${GC_TYPE_META[type].label}，已通知相关团队`);
    }
  };

  const handleClose = async () => {
    if (!closing) return;
    await closeGreenChannel(
      closing.id,
      outcome || '病情稳定，转专科',
      qualityNote || '时间节点达标',
    );
    message.success('绿色通道已关闭');
    setClosing(null);
    setOutcome('');
    setQualityNote('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-ink-secondary">
          在院绿色通道{' '}
          <b className="text-medical-critical">
            {greenChannels.filter((g) => g.status === 'active').length}
          </b>{' '}
          条激活中
        </div>
        <Button type="primary" icon={<PlusCircleOutlined />} onClick={() => setOpen(true)}>
          一键启动绿色通道
        </Button>
      </div>

      {greenChannels.length === 0 && <Empty description="暂无绿色通道" />}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {greenChannels.map((gc) => (
          <ChannelCard key={gc.id} gc={gc} onClose={(g) => setClosing(g)} />
        ))}
      </div>

      {/* 启动通道 */}
      <Modal
        open={open}
        title="一键启动绿色通道"
        onCancel={() => setOpen(false)}
        footer={null}
        width={640}
      >
        <p className="mb-3 text-xs text-ink-secondary">
          <EnvironmentOutlined />{' '}
          选择通道类型后，系统自动填充患者信息并通知相关团队（胸痛/卒中/创伤/手术室/ICU）。
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(GC_TYPE_META) as GreenChannelType[]).map((t) => (
            <Button
              key={t}
              size="large"
              style={{
                borderColor: GC_TYPE_META[t].color,
                color: GC_TYPE_META[t].color,
                height: 56,
                textAlign: 'left',
              }}
              icon={<PlayCircleOutlined />}
              onClick={() => handleActivate(t)}
            >
              {GC_TYPE_META[t].label}
            </Button>
          ))}
        </div>
      </Modal>

      {/* 关闭通道 */}
      <Modal
        open={!!closing}
        title={`关闭绿色通道 · ${closing?.patientName ?? ''}`}
        onOk={handleClose}
        onCancel={() => setClosing(null)}
        okText="确认关闭"
      >
        <div className="space-y-3">
          <div>
            <div className="text-xs text-ink-secondary">转归</div>
            <Input
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="如：急诊PCI成功，转CCU"
            />
          </div>
          <div>
            <div className="text-xs text-ink-secondary">质量评估</div>
            <TextArea
              rows={2}
              value={qualityNote}
              onChange={(e) => setQualityNote(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
