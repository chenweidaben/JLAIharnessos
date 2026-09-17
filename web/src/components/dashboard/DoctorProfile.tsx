/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 工作台仪表盘 - 医生个人信息卡片
 */

import { ScheduleOutlined, SettingOutlined, LockOutlined, StarFilled } from '@ant-design/icons';
import { clsx } from 'clsx';
import type { DoctorProfile, ShiftType } from '@/types/dashboard';

const shiftLabel: Record<ShiftType, { label: string; className: string }> = {
  morning: { label: '上午', className: 'bg-blue-100 text-blue-700' },
  afternoon: { label: '下午', className: 'bg-purple-100 text-purple-700' },
  night: { label: '夜班', className: 'bg-indigo-100 text-indigo-700' },
  off: { label: '休', className: 'bg-gray-100 text-gray-500' },
};

interface DoctorProfileCardProps {
  profile: DoctorProfile;
}

export const DoctorProfileCard: React.FC<DoctorProfileCardProps> = ({ profile }) => {
  const shifts = [
    { key: 'morning' as ShiftType, value: profile.shifts.morning },
    { key: 'afternoon' as ShiftType, value: profile.shifts.afternoon },
    { key: 'night' as ShiftType, value: profile.shifts.night },
  ];

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      {/* 医生信息头 */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0A4D8C] text-xl font-bold text-white">
          {profile.name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-800">{profile.name}</span>
            <span className="rounded bg-[#0A4D8C]/10 px-1.5 py-0.5 text-xs text-[#0A4D8C]">
              {profile.title}
            </span>
          </div>
          <div className="mt-0.5 text-sm text-gray-500">{profile.department}</div>
        </div>
      </div>

      {/* 今日排班 */}
      <div className="mt-4">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-600">
          <ScheduleOutlined className="text-xs" /> 今日排班
        </div>
        <div className="flex gap-2">
          {shifts.map((s) => (
            <span
              key={s.key}
              className={clsx(
                'rounded-md px-2.5 py-1 text-xs font-medium',
                shiftLabel[s.value].className,
              )}
            >
              {shiftLabel[s.key as keyof typeof shiftLabel]?.label} → {shiftLabel[s.value].label}
            </span>
          ))}
        </div>
      </div>

      {/* 本月工作量 */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-gray-50 p-2.5 text-center">
          <div className="text-lg font-bold text-[#0A4D8C]">
            {profile.monthlyStats.outpatientVisits}
          </div>
          <div className="text-xs text-gray-400">门诊人次</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-2.5 text-center">
          <div className="text-lg font-bold text-[#0A4D8C]">{profile.monthlyStats.surgeries}</div>
          <div className="text-xs text-gray-400">手术台次</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-2.5 text-center">
          <div className="text-lg font-bold text-[#0A4D8C]">
            {profile.monthlyStats.medicalRecords}
          </div>
          <div className="text-xs text-gray-400">病历份数</div>
        </div>
      </div>

      {/* 绩效指标 */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">病历质控合格率</span>
          <span className="font-semibold text-gray-700">
            {profile.performance.recordQualityRate}%
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 flex items-center gap-1">
            <StarFilled className="text-yellow-400 text-[10px]" /> 患者满意度
          </span>
          <span className="font-semibold text-gray-700">
            {profile.performance.patientSatisfaction}%
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">平均住院日</span>
          <span className="font-semibold text-gray-700">{profile.performance.avgStayDays} 天</span>
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="mt-4 flex gap-2 border-t border-gray-50 pt-3">
        <button className="flex flex-1 items-center justify-center gap-1 rounded-md bg-gray-50 py-1.5 text-xs text-gray-600 hover:bg-gray-100">
          <ScheduleOutlined /> 排班
        </button>
        <button className="flex flex-1 items-center justify-center gap-1 rounded-md bg-gray-50 py-1.5 text-xs text-gray-600 hover:bg-gray-100">
          <LockOutlined /> 修改密码
        </button>
        <button className="flex flex-1 items-center justify-center gap-1 rounded-md bg-gray-50 py-1.5 text-xs text-gray-600 hover:bg-gray-100">
          <SettingOutlined /> 设置
        </button>
      </div>
    </div>
  );
};

export default DoctorProfileCard;
