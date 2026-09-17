/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 生命体征面板：体温 / 心率 / 血压 / 血氧
 */
import { Card, Col, Row } from 'antd';
import type { VitalSign } from '@/types/patient';
import { formatBloodPressure, formatMedicalValue } from '@/utils/format';

function Metric({ label, value, unit }: { label: string; value?: number; unit?: string }) {
  const digits = value != null && value < 10 ? 1 : 0;
  return (
    <div className="rounded-lg bg-ink-bg p-3 text-center">
      <div className="text-xs text-ink-secondary">{label}</div>
      <div className="mt-1 text-xl font-semibold text-jl-primary">
        {formatMedicalValue(value, unit, digits)}
      </div>
    </div>
  );
}

export default function VitalSignsPanel({ data }: { data?: VitalSign }) {
  return (
    <Card className="shadow-card" title="实时生命体征">
      <Row gutter={[12, 12]}>
        <Col span={6}>
          <Metric label="体温" value={data?.temperature} unit="℃" />
        </Col>
        <Col span={6}>
          <Metric label="心率" value={data?.heartRate} unit="bpm" />
        </Col>
        <Col span={6}>
          <div className="rounded-lg bg-ink-bg p-3 text-center">
            <div className="text-xs text-ink-secondary">血压</div>
            <div className="mt-1 text-xl font-semibold text-jl-primary">
              {formatBloodPressure(data?.systolic, data?.diastolic)}
            </div>
          </div>
        </Col>
        <Col span={6}>
          <Metric label="血氧" value={data?.spo2} unit="%" />
        </Col>
      </Row>
    </Card>
  );
}
