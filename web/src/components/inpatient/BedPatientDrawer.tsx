/**
 * 健澜科技 jlmedaios - 床位患者摘要抽屉（M1-A）
 *
 * 展示在院患者完整摘要 + ADT 移动史，并提供换床 / 转科 / 出院操作。
 * 按钮按当前登录者权限码禁用（前端易用性），后端 BFF 仍强制鉴权与 DataScope。
 * AI 无法触达这些事务：所有操作均以真实登录医护身份发起，医师复核签名。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useMemo, useState, useEffect } from 'react';
import {
  Button,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Input,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tag,
  Timeline,
} from 'antd';
import {
  ExportOutlined,
  SwapOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useInpatientStore } from '@/store/inpatientStore';
import { useAuthStore } from '@/store/authStore';
import type { AdtEventType, MovementView } from '@/types/inpatient';
import {
  admissionSourceMeta,
  admissionTypeMeta,
  bedStatusMeta,
  conditionMeta,
  genderText,
  nursingLevelMeta,
} from './bedMeta';

const EVENT_LABEL: Record<AdtEventType, string> = {
  admit: '入院',
  bed_change: '换床',
  transfer: '转科',
  discharge: '出院',
};

function allergyText(a: unknown): string {
  if (typeof a === 'string') return a;
  if (a && typeof a === 'object') {
    const o = a as Record<string, unknown>;
    return String(o.drug ?? o.name ?? o.allergen ?? JSON.stringify(a));
  }
  return String(a);
}

function movementText(m: MovementView): string {
  if (m.eventType === 'admit') return `入院 → ${m.toWard ?? ''} ${m.toBed ?? ''}`.trim();
  if (m.eventType === 'discharge')
    return `出院：${m.fromWard ?? ''} ${m.fromBed ?? ''}`.trim();
  const from = `${m.fromWard ?? ''}${m.fromBed ? ' ' + m.fromBed : ''}`;
  const to = `${m.toWard ?? ''}${m.toBed ? ' ' + m.toBed : ''}`;
  return `${from} → ${to}`;
}

export default function BedPatientDrawer() {
  const {
    selectedVisitId,
    detail,
    loadingDetail,
    acting,
    bedMap,
    selectVisit,
    changeBed,
    transfer,
    discharge,
  } = useInpatientStore();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [targetBedId, setTargetBedId] = useState<string | undefined>();
  const [toWardId, setToWardId] = useState<string | undefined>();
  const [toBedId, setToBedId] = useState<string | undefined>();
  const [dischargeReason, setDischargeReason] = useState('');

  // 切换患者时重置表单
  useEffect(() => {
    setTargetBedId(undefined);
    setToWardId(undefined);
    setToBedId(undefined);
    setDischargeReason('');
  }, [selectedVisitId]);

  /** 同病区空闲床（换床） */
  const sameWardFreeBeds = useMemo(() => {
    if (!detail?.wardId || !bedMap) return [];
    const ward = bedMap.wards.find((w) => w.id === detail.wardId);
    return ward ? ward.beds.filter((b) => b.status === 'available') : [];
  }, [detail, bedMap]);

  /** 全部可见病区（转科） */
  const allWards = useMemo(() => bedMap?.wards ?? [], [bedMap]);

  /** 目标病区空闲床（转科，可选=自动分配） */
  const targetWardFreeBeds = useMemo(() => {
    if (!toWardId || !bedMap) return [];
    const ward = bedMap.wards.find((w) => w.id === toWardId);
    return ward ? ward.beds.filter((b) => b.status === 'available') : [];
  }, [toWardId, bedMap]);

  const open = selectedVisitId !== null;

  return (
    <Drawer
      width={620}
      open={open}
      onClose={() => void selectVisit(null)}
      title={
        detail
          ? `${detail.wardName ?? ''} · ${detail.bedNo ?? ''}　${detail.nameMasked}`
          : '患者摘要'
      }
      destroyOnClose
    >
      <Spin spinning={loadingDetail}>
        {!detail ? (
          <Empty description="暂无患者数据" />
        ) : (
          <>
            <Space wrap>
              {detail.condition && (
                <Tag color={conditionMeta[detail.condition].bg} style={{ color: conditionMeta[detail.condition].color }}>
                  {conditionMeta[detail.condition].label}
                </Tag>
              )}
              <Tag color={nursingLevelMeta[detail.nursingLevel].bg} style={{ color: nursingLevelMeta[detail.nursingLevel].color }}>
                {nursingLevelMeta[detail.nursingLevel].label}
              </Tag>
              {detail.tags?.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </Space>

            <Divider orientation="left">基本信息</Divider>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="住院号">{detail.admissionNo ?? '--'}</Descriptions.Item>
              <Descriptions.Item label="就诊号">{detail.visitNo}</Descriptions.Item>
              <Descriptions.Item label="病案号(MRN)">{detail.mrn}</Descriptions.Item>
              <Descriptions.Item label="性别/年龄">
                {genderText(detail.gender)} · {detail.age ?? '--'}岁
              </Descriptions.Item>
              <Descriptions.Item label="入院方式">
                {detail.admissionType ? admissionTypeMeta[detail.admissionType] : '--'}
              </Descriptions.Item>
              <Descriptions.Item label="入院来源">
                {detail.source ? admissionSourceMeta[detail.source] : '--'}
              </Descriptions.Item>
              <Descriptions.Item label="入院时间">
                {detail.admittedAt ? new Date(detail.admittedAt).toLocaleString('zh-CN') : '--'}
              </Descriptions.Item>
              <Descriptions.Item label="住院天数">{detail.daysInHospital} 天</Descriptions.Item>
              <Descriptions.Item label="所在病区" span={2}>
                {detail.wardName}（{detail.roomNo}房 / {detail.bedNo}床）
              </Descriptions.Item>
              <Descriptions.Item label="入院诊断" span={2}>
                {detail.diagnosis}
              </Descriptions.Item>
            </Descriptions>

            {detail.allergies?.length > 0 && (
              <>
                <Divider orientation="left">过敏史</Divider>
                <Space wrap>
                  {detail.allergies.map((a, i) => (
                    <Tag color="red" key={i}>
                      {allergyText(a)}
                    </Tag>
                  ))}
                </Space>
              </>
            )}

            <Divider orientation="left">ADT 移动史</Divider>
            <Timeline
              items={[...detail.movements]
                .sort((a, b) => new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime())
                .map((m) => ({
                  color:
                    m.eventType === 'discharge'
                      ? 'gray'
                      : m.eventType === 'transfer'
                        ? 'blue'
                        : 'green',
                  children: (
                    <div>
                      <Space size={6}>
                        <Tag style={{ marginInlineEnd: 0 }}>{EVENT_LABEL[m.eventType]}</Tag>
                        <span style={{ fontSize: 12 }}>{movementText(m)}</span>
                      </Space>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                        {new Date(m.eventAt).toLocaleString('zh-CN')}
                        {m.reason ? ` · ${m.reason}` : ''}
                      </div>
                    </div>
                  ),
                }))}
            />

            <Divider orientation="left">床位事务（医师复核）</Divider>

            {/* 换床（同病区） */}
            <Space wrap style={{ marginBottom: 12 }}>
              <SwapOutlined />
              <span>换床：</span>
              <Select
                allowClear
                placeholder="选择同病区空闲床"
                style={{ width: 200 }}
                value={targetBedId}
                onChange={setTargetBedId}
                options={sameWardFreeBeds.map((b) => ({
                  value: b.id,
                  label: `${b.bedNo}（${bedStatusMeta[b.status].label}）`,
                }))}
              />
              <Button
                type="primary"
                ghost
                disabled={!hasPermission('inpatient:manage') || !targetBedId}
                loading={acting}
                onClick={() =>
                  targetBedId && void changeBed(detail.visitId, targetBedId)
                }
              >
                确认换床
              </Button>
            </Space>
            <br />

            {/* 转科 */}
            <Space wrap style={{ marginBottom: 12 }}>
              <ArrowRightOutlined />
              <span>转科：</span>
              <Select
                placeholder="目标病区"
                style={{ width: 220 }}
                value={toWardId}
                onChange={(v) => {
                  setToWardId(v);
                  setToBedId(undefined);
                }}
                options={allWards.map((w) => ({
                  value: w.id,
                  label: `${w.name}（${w.department}）`,
                }))}
              />
              <Select
                allowClear
                placeholder="目标床（空=自动）"
                style={{ width: 170 }}
                value={toBedId}
                onChange={setToBedId}
                options={targetWardFreeBeds.map((b) => ({ value: b.id, label: b.bedNo }))}
              />
              <Button
                type="primary"
                ghost
                disabled={!hasPermission('inpatient:manage') || !toWardId}
                loading={acting}
                onClick={() =>
                  toWardId && void transfer(detail.visitId, toWardId, toBedId)
                }
              >
                确认转科
              </Button>
            </Space>
            <br />

            {/* 出院（释放床位） */}
            <Space wrap align="start">
              <ExportOutlined />
              <span>出院：</span>
              <Input.TextArea
                placeholder="出院备注（可选）"
                style={{ width: 280 }}
                rows={1}
                value={dischargeReason}
                onChange={(e) => setDischargeReason(e.target.value)}
              />
              <Popconfirm
                title="确认办理出院？"
                description="出院后床位将立即释放，操作记入审计。"
                onConfirm={() =>
                  void discharge(detail.visitId, dischargeReason || undefined)
                }
                okText="确认出院"
                cancelText="取消"
              >
                <Button
                  danger
                  type="primary"
                  disabled={!hasPermission('inpatient:discharge')}
                  loading={acting}
                >
                  办理出院
                </Button>
              </Popconfirm>
            </Space>
          </>
        )}
      </Spin>
    </Drawer>
  );
}
