/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 患者基本信息卡（脱敏展示）
 */
import { Card, Descriptions, Tag } from 'antd';
import { UserOutlined } from '@ant-design/icons';

import type { Patient, CareLevel } from '@/types/patient';
import { maskName, maskPhone } from '@/utils/desensitize';

const careLevelMap: Record<CareLevel, { label: string; color: string }> = {
  special: { label: '特级护理', color: '#F5222D' },
  first: { label: '一级护理', color: '#FA8C16' },
  second: { label: '二级护理', color: '#1890FF' },
  third: { label: '三级护理', color: '#52C41A' },
};

export default function PatientInfoCard({ patient }: { patient: Patient }) {
  const care = patient.careLevel ? careLevelMap[patient.careLevel] : null;
  return (
    <Card
      className="shadow-card"
      title={
        <div className="flex items-center gap-2">
          <UserOutlined style={{ color: '#0A4D8C' }} />
          <span>患者信息</span>
        </div>
      }
      extra={care && <Tag color={care.color}>{care.label}</Tag>}
    >
      <Descriptions column={2} size="small">
        <Descriptions.Item label="姓名">{maskName(patient.name)}</Descriptions.Item>
        <Descriptions.Item label="性别 / 年龄">
          {patient.gender === 'male' ? '男' : patient.gender === 'female' ? '女' : '未知'} /{' '}
          {patient.age}岁
        </Descriptions.Item>
        <Descriptions.Item label="住院号">{patient.patientNo}</Descriptions.Item>
        <Descriptions.Item label="床号">{patient.bedNo ?? '--'}</Descriptions.Item>
        <Descriptions.Item label="科室">{patient.deptName ?? '--'}</Descriptions.Item>
        <Descriptions.Item label="联系电话">{maskPhone(patient.phoneMasked)}</Descriptions.Item>
        <Descriptions.Item label="入院诊断" span={2}>
          {patient.diagnosis ?? '--'}
        </Descriptions.Item>
        <Descriptions.Item label="过敏史" span={2}>
          {patient.allergies && patient.allergies.length > 0 ? (
            patient.allergies.map((a) => (
              <Tag key={a} color="#FA8C16">
                {a}
              </Tag>
            ))
          ) : (
            <span className="text-medical-normal">无</span>
          )}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
