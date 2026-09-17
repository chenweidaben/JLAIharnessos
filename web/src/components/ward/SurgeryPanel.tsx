/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 手术管理组件 - 今日手术列表 / 术前核查 / 术后管理
 */
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Empty,
  List,
  Modal,
  Tag,
  message,
} from 'antd';
import { EyeOutlined, SafetyCertificateOutlined, ScissorOutlined } from '@ant-design/icons';
import type { SurgeryInfo } from '@/types/ward';

interface SurgeryPanelProps {
  list: SurgeryInfo[];
}

const stageMeta = {
  preop: { label: '术前', color: 'orange' },
  intraop: { label: '术中', color: 'processing' },
  postop: { label: '术后', color: 'success' },
} as const;

const checkItems: Array<{ key: keyof SurgeryInfo['preopChecks']; label: string }> = [
  { key: 'discussionDone', label: '术前讨论完成' },
  { key: 'surgeryConsent', label: '手术同意书签署' },
  { key: 'anesthesiaConsent', label: '麻醉同意书签署' },
  { key: 'fasting', label: '术前禁食禁饮' },
  { key: 'bloodPrepared', label: '备血 / 备皮' },
  { key: 'skinPrepared', label: '术区皮肤准备' },
  { key: 'preopMeds', label: '术前用药' },
  { key: 'timeOut', label: 'Time Out 术前核查' },
];

export default function SurgeryPanel({ list }: SurgeryPanelProps) {
  const [selected, setSelected] = useState<SurgeryInfo | null>(list[0] ?? null);
  const [recordOpen, setRecordOpen] = useState(false);

  return (
    <div className="rounded-lg border border-ink-border bg-white shadow-card">
      <div className="flex items-center gap-2 border-b border-ink-border p-3">
        <ScissorOutlined className="text-jl-primary" />
        <span className="font-semibold text-ink-primary">手术管理</span>
        <Tag color="blue">今日 {list.length} 台</Tag>
      </div>

      <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-3">
        <div className="rounded-md border border-ink-border">
          <div className="border-b border-ink-border p-2 text-sm font-semibold">今日手术排程</div>
          {list.length === 0 ? (
            <Empty description="今日无手术" />
          ) : (
            <List
              size="small"
              dataSource={list}
              renderItem={(item) => (
                <List.Item className="cursor-pointer px-3" onClick={() => setSelected(item)}>
                  <List.Item.Meta
                    title={
                      <span>
                        <Badge color={stageMeta[item.stage].color} />
                        {item.bedNo}床 · {item.name}
                      </span>
                    }
                    description={
                      <span>
                        {item.surgeryName}
                        <Tag color={stageMeta[item.stage].color} className="ml-1">
                          {stageMeta[item.stage].label}
                        </Tag>
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>

        <div className="md:col-span-2">
          {selected ? (
            <div>
              <Descriptions size="small" bordered column={2}>
                <Descriptions.Item label="手术名称" span={2}>
                  {selected.surgeryName}
                </Descriptions.Item>
                <Descriptions.Item label="术者">{selected.surgeon}</Descriptions.Item>
                <Descriptions.Item label="麻醉方式">{selected.anesthesia}</Descriptions.Item>
                <Descriptions.Item label="手术室">{selected.operatingRoom}</Descriptions.Item>
                <Descriptions.Item label="预计时间">
                  {selected.scheduledTime}（约{selected.durationMin}分钟）
                </Descriptions.Item>
              </Descriptions>

              <div className="mt-3">
                <div className="mb-1 text-sm font-semibold">术前准备核查</div>
                <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
                  {checkItems.map((c) => (
                    <Checkbox key={c.key} checked={selected.preopChecks[c.key]} disabled>
                      {c.label}
                    </Checkbox>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  type="primary"
                  icon={<SafetyCertificateOutlined />}
                  onClick={() => message.success('Time Out 核查已完成，可接入手术室')}
                >
                  完成 Time Out 核查
                </Button>
                <Button icon={<EyeOutlined />} onClick={() => setRecordOpen(true)}>
                  手术记录
                </Button>
                <Button onClick={() => message.success('已调用术后常规医嘱模板')}>
                  下术后医嘱
                </Button>
              </div>
            </div>
          ) : (
            <Empty description="请选择手术患者" />
          )}
        </div>
      </div>

      <Modal
        title="手术 / 麻醉记录"
        open={recordOpen}
        onCancel={() => setRecordOpen(false)}
        footer={<Button onClick={() => setRecordOpen(false)}>关闭</Button>}
      >
        {selected && (
          <Card size="small" className="text-sm">
            <p>
              <strong>手术记录：</strong>
              {selected.surgeryName}，术者 {selected.surgeon}，麻醉方式 {selected.anesthesia}
              。术中患者生命体征平稳，术程顺利，标本送检。
            </p>
            <p className="mt-2">
              <strong>术后医嘱：</strong>
              术后心电监护、吸氧、伤口换药、预防感染、镇痛治疗，密切观察穿刺点及引流情况。
            </p>
          </Card>
        )}
      </Modal>
    </div>
  );
}
