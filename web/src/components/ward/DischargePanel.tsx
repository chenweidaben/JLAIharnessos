/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 出院管理组件 - 待出院列表 / 出院评估 / 出院小结 / 结算流程
 */
import { useState } from 'react';
import { Button, Card, Descriptions, Empty, List, message, Modal, Steps, Tag } from 'antd';
import {
  CheckCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  PrinterOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import type { DischargeInfo } from '@/types/ward';

interface DischargePanelProps {
  list: DischargeInfo[];
}

const stepLabels = ['停止医嘱', '完成病历', '出院评估', '费用结算', '办理离院'];

export default function DischargePanel({ list }: DischargePanelProps) {
  const [selected, setSelected] = useState<DischargeInfo | null>(list[0] ?? null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const currentStep = selected
    ? [
        selected.process.ordersStopped,
        selected.process.recordCompleted,
        selected.process.evaluationDone,
        selected.process.settled,
        selected.process.departed,
      ].filter(Boolean).length - 1
    : 0;

  return (
    <div className="rounded-lg border border-ink-border bg-white shadow-card">
      <div className="flex items-center gap-2 border-b border-ink-border p-3">
        <FileTextOutlined className="text-jl-primary" />
        <span className="font-semibold text-ink-primary">出院管理</span>
        <Tag color="cyan">{list.length} 人待出院</Tag>
      </div>

      <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-3">
        {/* 待出院列表 */}
        <div className="rounded-md border border-ink-border">
          <div className="border-b border-ink-border p-2 text-sm font-semibold">待出院患者</div>
          {list.length === 0 ? (
            <Empty description="无待出院患者" />
          ) : (
            <List
              size="small"
              dataSource={list}
              renderItem={(item) => (
                <List.Item
                  className="cursor-pointer px-3"
                  onClick={() => setSelected(item)}
                  style={{ background: selected?.id === item.id ? '#E6F4FF' : undefined }}
                >
                  <List.Item.Meta
                    title={
                      <span>
                        {item.bedNo}床 · {item.name}
                      </span>
                    }
                    description={item.diagnosis}
                  />
                </List.Item>
              )}
            />
          )}
        </div>

        {/* 出院评估详情 */}
        <div className="md:col-span-2">
          {selected ? (
            <div>
              <Steps
                size="small"
                current={currentStep < 0 ? 0 : currentStep}
                items={stepLabels.map((t) => ({ title: t }))}
                className="mb-4"
              />
              <Descriptions size="small" bordered column={2}>
                <Descriptions.Item label="床号/姓名">
                  {selected.bedNo}床 · {selected.name}
                </Descriptions.Item>
                <Descriptions.Item label="出院诊断">
                  {selected.dischargeDiagnosis}
                </Descriptions.Item>
                <Descriptions.Item label="费用总计">
                  ¥{selected.totalFee.toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="医保报销">
                  ¥{selected.insuranceCovered.toFixed(2)}
                </Descriptions.Item>
              </Descriptions>

              <div className="mt-3">
                <div className="mb-1 text-sm font-semibold">出院带药</div>
                {selected.medications.map((m) => (
                  <div key={m.id} className="text-xs text-ink-primary">
                    · {m.name} {m.dosage} {m.frequency} × {m.days}天（{m.usage}）
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <div className="mb-1 text-sm font-semibold">出院指导</div>
                {selected.guidance.map((g, i) => (
                  <Tag key={i} color="blue" className="mb-1">
                    {g}
                  </Tag>
                ))}
              </div>
              <div className="mt-3 text-xs text-ink-secondary">
                随访计划：{selected.followUp.time} · {selected.followUp.method} ·{' '}
                {selected.followUp.content}
              </div>

              <div className="mt-4 flex gap-2">
                <Button icon={<RobotOutlined />} onClick={() => setSummaryOpen(true)}>
                  AI生成出院小结
                </Button>
                <Button
                  icon={<DollarOutlined />}
                  type="primary"
                  onClick={() => message.success('已发起医保结算')}
                >
                  办理结算
                </Button>
                <Button icon={<PrinterOutlined />}>打印出院证明</Button>
                <Button
                  icon={<CheckCircleOutlined />}
                  onClick={() => message.success('已完成离院手续')}
                >
                  确认离院
                </Button>
              </div>
            </div>
          ) : (
            <Empty description="请选择待出院患者" />
          )}
        </div>
      </div>

      <Modal
        title="AI 生成出院小结"
        open={summaryOpen}
        onCancel={() => setSummaryOpen(false)}
        footer={[
          <Button key="print" icon={<PrinterOutlined />}>
            打印
          </Button>,
          <Button key="ok" type="primary" onClick={() => setSummaryOpen(false)}>
            保存
          </Button>,
        ]}
      >
        {selected && (
          <Card size="small" className="text-sm">
            <p>
              <strong>入院情况：</strong>患者因「{selected.diagnosis}」入院，入院时病情评估明确。
            </p>
            <p className="mt-2">
              <strong>诊疗经过：</strong>入院后完善相关检查，明确诊断为{selected.dischargeDiagnosis}
              ， 经规范化药物治疗及护理，患者症状缓解，病情稳定。
            </p>
            <p className="mt-2">
              <strong>出院情况：</strong>一般情况可，生命体征平稳，符合出院标准。 出院带药
              {selected.medications.length}种，嘱规律服药，{selected.followUp.time}复查。
            </p>
          </Card>
        )}
      </Modal>
    </div>
  );
}
