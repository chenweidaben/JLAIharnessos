/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 患者 360 摘要（右栏）：基本信息、过敏史、慢病史、当前用药、近期检验、生命体征。
 */
import React from 'react';
import { Avatar, Card, Descriptions, Empty, Space, Tag, Tooltip, Typography } from 'antd';
import {
  AlertOutlined,
  MedicineBoxOutlined,
  ExperimentOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useOutpatientStore } from '@/store/outpatientStore';
import { insuranceLabel } from './constants';

const { Text } = Typography;

export const PatientSummaryPanel: React.FC = () => {
  const patient = useOutpatientStore((s) => s.currentPatient);

  if (!patient) {
    return (
      <Card size="small">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未选择患者" />
      </Card>
    );
  }

  const v = patient.vitalSigns;

  return (
    <Card
      size="small"
      title={
        <Space>
          <Avatar icon={<UserOutlined />} style={{ background: '#0A4D8C' }} />
          <div>
            <div className="font-semibold">{patient.nameMasked}</div>
            <div className="text-xs text-ink-secondary">
              {patient.gender === 'male' ? '男' : '女'} · {patient.age}岁 ·{' '}
              {insuranceLabel[patient.insurance]}
            </div>
          </div>
        </Space>
      }
      styles={{ body: { padding: 12 } }}
    >
      {/* 基本信息 */}
      <Descriptions size="small" column={1} bordered className="mb-2">
        <Descriptions.Item label="患者ID">{patient.patientId}</Descriptions.Item>
        <Descriptions.Item label="证件">{patient.idCardMasked}</Descriptions.Item>
        <Descriptions.Item label="电话">{patient.phoneMasked}</Descriptions.Item>
        <Descriptions.Item label="最近就诊">{patient.lastVisit ?? '首次就诊'}</Descriptions.Item>
      </Descriptions>

      {/* 过敏史（高亮） */}
      {patient.allergies.length > 0 && (
        <div className="mb-2 p-2 rounded bg-red-50 border border-red-200">
          <div className="text-xs font-medium text-medical-critical mb-1">
            <AlertOutlined /> 过敏史
          </div>
          {patient.allergies.map((a) => (
            <Tag key={a} color="red" className="!mr-1">
              {a}
            </Tag>
          ))}
        </div>
      )}

      {/* 慢性病 */}
      {patient.chronicConditions.length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-ink-secondary mb-1">慢性疾病</div>
          {patient.chronicConditions.map((c) => (
            <Tag key={c} color="orange" className="!mr-1 mb-1">
              {c}
            </Tag>
          ))}
        </div>
      )}

      {/* 当前用药 */}
      {patient.currentMedications.length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-ink-secondary mb-1">
            <MedicineBoxOutlined /> 当前用药
          </div>
          {patient.currentMedications.map((m) => (
            <div key={m} className="text-xs py-0.5">
              {m}
            </div>
          ))}
        </div>
      )}

      {/* 生命体征 */}
      {v && (
        <div className="mb-2">
          <div className="text-xs text-ink-secondary mb-1">本次生命体征</div>
          <div className="grid grid-cols-3 gap-1 text-center">
            <VitalBox label="体温" value={v.temperature ? `${v.temperature}℃` : '-'} />
            <VitalBox label="脉搏" value={v.pulse ? `${v.pulse}` : '-'} />
            <VitalBox label="呼吸" value={v.respiration ? `${v.respiration}` : '-'} />
            <VitalBox label="血压" value={v.systolic ? `${v.systolic}/${v.diastolic}` : '-'} />
            <VitalBox label="SpO2" value={v.spo2 ? `${v.spo2}%` : '-'} />
            <VitalBox label="体重" value={v.weight ? `${v.weight}kg` : '-'} />
          </div>
        </div>
      )}

      {/* 近期检验 */}
      {patient.recentLabs && patient.recentLabs.length > 0 && (
        <div>
          <div className="text-xs text-ink-secondary mb-1">
            <ExperimentOutlined /> 近期异常检验
          </div>
          {patient.recentLabs.map((l) => (
            <div key={l.itemName} className="flex justify-between text-xs py-0.5">
              <span>{l.itemName}</span>
              <Tooltip title={`参考范围 ${l.refRange} · ${l.reportDate}`}>
                <Text strong style={{ color: l.abnormal === 'critical' ? '#F5222D' : '#FA8C16' }}>
                  {l.value} {l.unit}
                </Text>
              </Tooltip>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

const VitalBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-gray-50 rounded p-1">
    <div className="text-[10px] text-ink-secondary">{label}</div>
    <div className="text-sm font-medium">{value}</div>
  </div>
);

export default PatientSummaryPanel;
