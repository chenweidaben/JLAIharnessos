/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 查房记录组件 - 结构化表单 + AI辅助分析 + 电子签名
 */
import { useState } from 'react';
import {
  Button,
  Descriptions,
  Divider,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
} from 'antd';
import {
  EditOutlined,
  FileDoneOutlined,
  PrinterOutlined,
  RobotOutlined,
  SaveOutlined,
  SignatureOutlined,
} from '@ant-design/icons';
import type { RoundRecord as RoundRecordType } from '@/types/ward';
import { dietOptions } from './meta';

const { TextArea } = Input;

interface RoundRecordProps {
  record: RoundRecordType;
  onChange: (record: RoundRecordType) => void;
  onSubmit: (record: RoundRecordType) => void;
}

export default function RoundRecord({ record, onChange, onSubmit }: RoundRecordProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [signPassword, setSignPassword] = useState('');

  const update = <K extends keyof RoundRecordType>(key: K, value: RoundRecordType[K]) =>
    onChange({ ...record, [key]: value });

  const aiAnalyze = () => {
    setAiLoading(true);
    setTimeout(() => {
      const aiText = `【AI辅助查房分析】结合今日肌钙蛋白${
        record.todayLabs.find((l) => l.itemName.includes('肌钙蛋白'))?.value ?? '动态变化'
      }、生命体征及症状变化，患者病情${
        record.vitals.spo2 && record.vitals.spo2 < 95 ? '存在缺氧倾向，需加强氧疗' : '总体平稳'
      }。建议继续冠心病规范化治疗，密切监测心电及出入量，注意电解质平衡。`;
      update('analysis', record.analysis ? `${record.analysis}\n${aiText}` : aiText);
      setAiLoading(false);
      message.success('AI已生成辅助查房分析');
    }, 800);
  };

  const doSign = () => {
    if (!signPassword) {
      message.warning('请输入电子签名密码');
      return;
    }
    setSignModalOpen(false);
    onChange({ ...record, signed: true });
    message.success('电子签名完成，记录已锁定');
  };

  return (
    <div className="rounded-lg border border-ink-border bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-ink-border p-3">
        <div className="flex items-center gap-2">
          <FileDoneOutlined className="text-jl-primary" />
          <span className="font-semibold text-ink-primary">查房记录</span>
          {record.signed ? <Tag color="success">已签名</Tag> : <Tag color="warning">未签名</Tag>}
        </div>
        <Space>
          <Button icon={<RobotOutlined />} onClick={aiAnalyze} loading={aiLoading}>
            AI辅助分析
          </Button>
          <Button icon={<SaveOutlined />} onClick={() => message.success('草稿已保存')}>
            存草稿
          </Button>
          <Button icon={<PrinterOutlined />}>打印</Button>
          <Button
            type="primary"
            icon={<SignatureOutlined />}
            disabled={record.signed}
            onClick={() => setSignModalOpen(true)}
          >
            签名并提交
          </Button>
        </Space>
      </div>

      {aiLoading && (
        <div className="flex justify-center p-6">
          <Spin tip="AI正在分析病情..." />
        </div>
      )}

      <Form layout="vertical" className="p-4">
        {/* 主诉 */}
        <Form.Item label="主诉">
          <Input
            value={record.chiefComplaint}
            onChange={(e) => update('chiefComplaint', e.target.value)}
          />
        </Form.Item>

        {/* 现病史 */}
        <Form.Item label="现病史 / 今日病情变化">
          <TextArea
            rows={3}
            value={record.presentIllness}
            onChange={(e) => update('presentIllness', e.target.value)}
          />
        </Form.Item>

        {/* 体格检查 - 生命体征 */}
        <Divider orientation="left" orientationMargin={0}>
          <span className="text-sm font-semibold">体格检查</span>
        </Divider>
        <Descriptions size="small" bordered column={{ xs: 2, sm: 3, md: 6 }} className="mb-3">
          <Descriptions.Item label="体温">
            {record.vitals.temperature ? `${record.vitals.temperature}℃` : '--'}
          </Descriptions.Item>
          <Descriptions.Item label="脉搏">
            {record.vitals.pulse ? `${record.vitals.pulse}次/分` : '--'}
          </Descriptions.Item>
          <Descriptions.Item label="呼吸">
            {record.vitals.respiration ? `${record.vitals.respiration}次/分` : '--'}
          </Descriptions.Item>
          <Descriptions.Item label="血压">
            {record.vitals.systolic && record.vitals.diastolic
              ? `${record.vitals.systolic}/${record.vitals.diastolic}mmHg`
              : '--'}
          </Descriptions.Item>
          <Descriptions.Item label="SpO2">
            {record.vitals.spo2 ? `${record.vitals.spo2}%` : '--'}
          </Descriptions.Item>
          <Descriptions.Item label="测量时间">
            {record.vitals.measureTime ?? '--'}
          </Descriptions.Item>
        </Descriptions>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Form.Item label="一般情况 / 神志 / 精神">
            <TextArea
              rows={2}
              value={record.generalCondition}
              onChange={(e) => update('generalCondition', e.target.value)}
            />
          </Form.Item>
          <Form.Item label="心肺腹查体">
            <TextArea
              rows={2}
              value={record.physicalExam}
              onChange={(e) => update('physicalExam', e.target.value)}
            />
          </Form.Item>
          <Form.Item label="专科查体">
            <TextArea
              rows={2}
              value={record.specialtyExam}
              onChange={(e) => update('specialtyExam', e.target.value)}
            />
          </Form.Item>
          <Form.Item label="伤口 / 引流管">
            <TextArea
              rows={2}
              value={record.woundDrainage}
              onChange={(e) => update('woundDrainage', e.target.value)}
            />
          </Form.Item>
        </div>

        {/* 辅助检查 */}
        <Divider orientation="left" orientationMargin={0}>
          <span className="text-sm font-semibold">辅助检查</span>
        </Divider>
        <div className="mb-3 rounded-md border border-ink-border p-2">
          <div className="mb-2 text-xs font-semibold text-ink-secondary">今日检验结果</div>
          <div className="flex flex-wrap gap-2">
            {record.todayLabs.map((lab) => (
              <Tooltip key={lab.id} title={`参考范围：${lab.refRange ?? '--'}`}>
                <Tag
                  color={
                    lab.abnormal === 'normal'
                      ? 'default'
                      : lab.abnormal.includes('critical')
                        ? 'error'
                        : 'warning'
                  }
                >
                  {lab.itemName}：{lab.value}
                  {lab.unit ?? ''}
                </Tag>
              </Tooltip>
            ))}
          </div>
        </div>
        <div className="mb-3 rounded-md border border-ink-border p-2">
          <div className="mb-2 text-xs font-semibold text-ink-secondary">今日检查报告</div>
          {record.todayExams.map((ex) => (
            <div
              key={ex.id}
              className="flex items-center justify-between border-b border-ink-border py-1 text-xs last:border-0"
            >
              <span className="font-medium text-ink-primary">
                {ex.name} {ex.isToday && <Tag color="processing">今日</Tag>}
              </span>
              <span className="text-ink-secondary">{ex.impression}</span>
            </div>
          ))}
        </div>

        {/* 诊断 */}
        <Form.Item label="诊断">
          <div className="space-y-1">
            {record.diagnoses.map((d) => (
              <div key={d.id} className="flex items-center gap-2 text-sm">
                {d.isPrimary && <Tag color="red">主</Tag>}
                <span className="text-ink-primary">{d.name}</span>
                <EditOutlined className="cursor-pointer text-ink-secondary" />
              </div>
            ))}
            <Button size="small" type="dashed">
              + 添加诊断
            </Button>
          </div>
        </Form.Item>

        {/* 查房分析与计划 */}
        <Divider orientation="left" orientationMargin={0}>
          <span className="text-sm font-semibold">查房分析与诊疗计划</span>
        </Divider>
        <Form.Item label="病情分析（AI辅助）">
          <TextArea
            rows={4}
            value={record.analysis}
            onChange={(e) => update('analysis', e.target.value)}
          />
        </Form.Item>
        <Form.Item label="诊疗计划">
          <TextArea rows={4} value={record.plan} onChange={(e) => update('plan', e.target.value)} />
        </Form.Item>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Form.Item label="护理级别调整">
            <Select
              value={record.nursingLevelAdjust ?? undefined}
              placeholder="不调整"
              allowClear
              options={[
                { value: 'special', label: '特级护理' },
                { value: 'level1', label: '一级护理' },
                { value: 'level2', label: '二级护理' },
                { value: 'level3', label: '三级护理' },
              ]}
              onChange={(v) => update('nursingLevelAdjust', v)}
            />
          </Form.Item>
          <Form.Item label="饮食调整">
            <Select
              value={record.dietAdjust ?? undefined}
              placeholder="不调整"
              allowClear
              options={dietOptions.map((d) => ({ value: d, label: d }))}
              onChange={(v) => update('dietAdjust', v)}
            />
          </Form.Item>
          <Form.Item label="进一步检查">
            <Select
              mode="tags"
              value={record.furtherExams}
              placeholder="如：动态心电图"
              options={[
                { value: '24小时动态心电图', label: '24小时动态心电图' },
                { value: '复查BNP', label: '复查BNP' },
                { value: '心脏超声复查', label: '心脏超声复查' },
              ]}
              onChange={(v) => update('furtherExams', v)}
            />
          </Form.Item>
        </div>

        {/* 质控提醒 */}
        {record.qcWarnings.length > 0 && (
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2">
            <div className="text-xs font-semibold text-amber-700">病历质控提醒</div>
            {record.qcWarnings.map((w, i) => (
              <div key={i} className="text-xs text-amber-600">
                · {w}
              </div>
            ))}
          </div>
        )}

        {/* 医师签名 */}
        <Divider />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-ink-secondary">
            查房医师：<span className="font-semibold text-ink-primary">{record.doctorName}</span>（
            {record.doctorLevel === 'resident'
              ? '住院医师'
              : record.doctorLevel === 'attending'
                ? '主治医师'
                : '主任医师'}
            ） ，查房时间：{record.roundTime}
          </div>
          <Button
            type="primary"
            onClick={() => {
              onSubmit(record);
              message.success('查房记录已提交');
            }}
          >
            完成本次查房
          </Button>
        </div>
      </Form>

      <Modal
        title="电子签名确认"
        open={signModalOpen}
        onOk={doSign}
        onCancel={() => setSignModalOpen(false)}
        okText="确认签名"
      >
        <p className="text-sm text-ink-secondary">
          本次查房记录为：{record.doctorName}（
          {record.doctorLevel === 'resident' ? '住院医师' : '主治医师'}）
        </p>
        <p className="text-sm text-ink-secondary">签名后记录将锁定，不可修改。请输入UKey密码：</p>
        <Input.Password
          placeholder="请输入电子签名密码"
          value={signPassword}
          onChange={(e) => setSignPassword(e.target.value)}
          className="mt-2"
        />
      </Modal>
    </div>
  );
}
