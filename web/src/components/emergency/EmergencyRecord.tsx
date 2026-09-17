/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 急诊病历：病历模板 / AI辅助生成 / 病历质控 / 电子签名 / 打印
 */
import { useState } from 'react';
import { App as AntdApp, Button, Card, Col, Divider, Row, Tag } from 'antd';
import {
  CheckCircleOutlined,
  PrinterOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';

import { useEmergencyStore } from '@/store/emergencyStore';
import { formatDateTime } from '@/utils/format';

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

export default function EmergencyRecord() {
  const { message } = AntdApp.useApp();
  const { currentRecord, signEmergencyRecord } = useEmergencyStore();
  const [qcChecked, setQcChecked] = useState(false);

  if (!currentRecord) {
    return <Card className="shadow-card">病历加载中…</Card>;
  }

  const r = currentRecord;

  const handleSign = async () => {
    await signEmergencyRecord();
    message.success('电子签名完成，病历已归档');
  };

  const handleQc = () => {
    setQcChecked(true);
    if (r.qcWarnings.length === 0) message.success('病历质控通过，无缺陷项');
    else message.warning(`质控发现 ${r.qcWarnings.length} 项问题`);
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-lg font-semibold text-ink-primary">急诊病历</span>
            <span className="ml-3 text-sm text-ink-secondary">
              {r.patientName} · 记录时间 {formatDateTime(r.recordTime)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              icon={<RobotOutlined />}
              onClick={() => message.success('AI 已根据分诊与检查结果辅助生成病历初稿')}
            >
              AI 辅助生成
            </Button>
            <Button icon={<SafetyCertificateOutlined />} onClick={handleQc}>
              病历质控
            </Button>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              打印
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              disabled={r.signed}
              onClick={handleSign}
            >
              {r.signed ? '已签名归档' : '电子签名'}
            </Button>
          </div>
        </div>
      </Card>

      {qcChecked && (
        <Card size="small" style={{ borderLeft: '3px solid #FAAD14' }}>
          {r.qcWarnings.length === 0 ? (
            <span className="text-medical-normal">
              质控通过：主诉、现病史、查体、诊断、处理、签名要素齐全。
            </span>
          ) : (
            <ul className="list-disc pl-5 text-medical-critical">
              {r.qcWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* 病历正文（纸张式） */}
      <Card className="shadow-card" styles={{ body: { padding: 32 } }}>
        <div className="mx-auto max-w-3xl space-y-4 bg-white">
          <h2 className="text-center text-xl font-bold">急诊病历</h2>
          <div className="text-center text-xs text-ink-secondary">健澜科技数智医院 · 急诊科</div>
          <Divider style={{ margin: '12px 0' }} />

          <Section title="主诉">{r.chiefComplaint}</Section>
          <Section title="现病史">{r.presentIllness}</Section>

          <Row gutter={24}>
            <Col span={12}>
              <Section title="既往史">{r.pastHistory}</Section>
            </Col>
            <Col span={12}>
              <Section title="过敏史">{r.allergyHistory}</Section>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={12}>
              <Section title="个人史">{r.personalHistory}</Section>
            </Col>
            <Col span={12}>
              <Section title="家族史">{r.familyHistory}</Section>
            </Col>
          </Row>

          <Section title="体格检查">
            <div className="mb-1 text-xs text-ink-secondary">
              T {r.vitals.temperature}℃ · P {r.vitals.pulse}次/分 · R {r.vitals.respiration}次/分 ·
              BP {r.vitals.systolic}/{r.vitals.diastolic}mmHg · SpO₂ {r.vitals.spo2}%
            </div>
            {r.physicalExam}
          </Section>

          <Section title="辅助检查">
            <ul className="list-disc pl-5">
              {r.labs.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
              {r.exams.map((e, i) => (
                <li key={`e${i}`}>{e}</li>
              ))}
            </ul>
          </Section>

          <Section title="初步诊断">
            {r.diagnoses.map((d, i) => (
              <Tag key={i} color="blue" className="mr-1">
                {d}
              </Tag>
            ))}
          </Section>

          <Section title="处理措施">
            <ul className="list-disc pl-5">
              {r.treatments.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </Section>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-ink-secondary">病情告知：</span>
            {r.noticeGiven ? (
              <Tag color="success">已告知并签字</Tag>
            ) : (
              <Tag color="warning">待告知</Tag>
            )}
          </div>

          <Divider style={{ margin: '12px 0' }} />
          <div className="flex justify-end text-sm">
            <span>
              医师签名：<b>{r.doctorName}</b>
              {r.signed && <CheckCircleOutlined className="ml-1 text-medical-normal" />}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
