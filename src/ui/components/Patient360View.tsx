/**
 * 健澜科技数智医院智能体 - 患者 360 视图
 *
 * 患者全维度信息聚合视图：基本信息、就诊历史、生命体征趋势、
 * 检验结果、医嘱用药、病历文档六个标签页，支持键盘左右/数字键切换。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text } from 'ink';
import React, { useState } from 'react';

import { useThemeColors } from '../theme';
import { formatDateTime } from '../utils/formatMedical';
import { Badge } from './common/Badge';
import { TabView } from './common/TabView';
import { TrendChart } from './common/TrendChart';
import { LabResultPanel, mockLabResults } from './LabResultPanel';
import { mockOrders, OrderListPanel } from './OrderListPanel';
import { mockVitalSigns, VitalSignsPanel } from './VitalSignsPanel';

// ============================================================================
// Mock 数据
// ============================================================================

/** 就诊历史时间线条目 */
export interface VisitHistoryEntry {
  /** 就诊时间 */
  time: string;
  /** 就诊类型 */
  visitType: string;
  /** 科室 */
  department: string;
  /** 诊断 */
  diagnosis: string;
  /** 转归 */
  outcome: string;
}

/** 病历文档条目 */
export interface MedicalDocEntry {
  /** 文档名 */
  title: string;
  /** 类型 */
  type: string;
  /** 作者 */
  author: string;
  /** 时间 */
  time: string;
  /** 是否已审签 */
  reviewed: boolean;
}

/** 患者 360 完整数据集 */
export interface Patient360Data {
  /** 基本信息 */
  basic: {
    name: string;
    gender: string;
    age: number;
    department: string;
    bedNo: string;
    diagnosis: string;
    allergies: string[];
    pastHistory: string[];
    admission: string;
    doctor: string;
  };
  /** 就诊历史 */
  history: VisitHistoryEntry[];
  /** 生命体征 7 天趋势 */
  vitalTrend: { date: string; heartRate: number; sbp: number }[];
  /** 病历文档 */
  documents: MedicalDocEntry[];
}

/** 默认 Mock 患者 360 数据 */
export const mockPatient360: Patient360Data = {
  basic: {
    name: '张明华',
    gender: '男',
    age: 58,
    department: '心血管内科',
    bedNo: '12床',
    diagnosis: '冠状动脉粥样硬化性心脏病；急性非ST段抬高型心肌梗死；2型糖尿病',
    allergies: ['青霉素', '磺胺类药物'],
    pastHistory: ['高血压病史10年', '2型糖尿病8年', '2019年冠脉支架植入术(前降支)'],
    admission: '2026-09-12T08:30:00',
    doctor: '李建国 主任医师',
  },
  history: [
    {
      time: '2026-09-12 08:30',
      visitType: '住院',
      department: '心血管内科',
      diagnosis: '急性非ST段抬高型心肌梗死',
      outcome: '住院治疗中',
    },
    {
      time: '2026-08-20 09:00',
      visitType: '门诊',
      department: '心血管内科',
      diagnosis: '不稳定型心绞痛',
      outcome: '门诊随访',
    },
    {
      time: '2026-03-15 10:00',
      visitType: '门诊',
      department: '内分泌科',
      diagnosis: '2型糖尿病血糖调整',
      outcome: '门诊配药',
    },
    {
      time: '2025-11-02 14:00',
      visitType: '急诊',
      department: '急诊内科',
      diagnosis: '胸痛待查',
      outcome: '留观后好转',
    },
    {
      time: '2019-06-10 09:00',
      visitType: '住院',
      department: '心血管内科',
      diagnosis: '急性心肌梗死（前降支PCI）',
      outcome: '好转出院',
    },
  ],
  vitalTrend: [
    { date: '09-08', heartRate: 76, sbp: 128 },
    { date: '09-09', heartRate: 78, sbp: 132 },
    { date: '09-10', heartRate: 82, sbp: 138 },
    { date: '09-11', heartRate: 88, sbp: 142 },
    { date: '09-12', heartRate: 96, sbp: 150 },
    { date: '09-13', heartRate: 98, sbp: 145 },
    { date: '09-14', heartRate: 98, sbp: 145 },
  ],
  documents: [
    {
      title: '入院记录',
      type: '入院记录',
      author: '李建国',
      time: '2026-09-12 09:00',
      reviewed: true,
    },
    {
      title: '首次病程记录',
      type: '首次病程',
      author: '李建国',
      time: '2026-09-12 10:00',
      reviewed: true,
    },
    {
      title: '日常病程记录(09-13)',
      type: '日常病程',
      author: '王芳',
      time: '2026-09-13 11:00',
      reviewed: true,
    },
    {
      title: '日常病程记录(09-14)',
      type: '日常病程',
      author: '王芳',
      time: '2026-09-14 08:30',
      reviewed: false,
    },
    {
      title: '上级医师查房记录',
      type: '查房记录',
      author: '李建国',
      time: '2026-09-13 15:00',
      reviewed: true,
    },
    {
      title: '知情同意书(冠脉造影)',
      type: '知情同意书',
      author: '张明华',
      time: '2026-09-14 09:00',
      reviewed: false,
    },
  ],
};

// ============================================================================
// 组件 Props
// ============================================================================

/** Patient360View 属性 */
export interface Patient360ViewProps {
  /** 患者 360 数据，默认 Mock */
  data?: Patient360Data;
  /** 默认激活标签 id */
  defaultTab?: string;
}

// ============================================================================
// 子视图：基本信息
// ============================================================================

function BasicInfoView({ data }: { data: Patient360Data }): React.ReactElement {
  const theme = useThemeColors();
  const b = data.basic;
  return (
    <Box flexDirection="column">
      <Box flexDirection="row" gap={3}>
        <Text color={theme.text} bold>
          {b.name}
        </Text>
        <Text color={theme.subtle}>
          {b.gender} · {b.age}岁
        </Text>
        <Text color={theme.subtle}>{b.department}</Text>
        <Text color={theme.subtle}>{b.bedNo}</Text>
      </Box>
      <Box flexDirection="row" gap={1} marginTop={0}>
        <Text color={theme.subtle}>诊断:</Text>
        <Text color={theme.text}>{b.diagnosis}</Text>
      </Box>
      <Box flexDirection="row" gap={3} marginTop={0}>
        <Text color={theme.subtle}>
          主管医生: <Text color={theme.text}>{b.doctor}</Text>
        </Text>
        <Text color={theme.subtle}>
          入院时间: <Text color={theme.text}>{formatDateTime(b.admission)}</Text>
        </Text>
      </Box>
      <Box flexDirection="row" gap={1} marginTop={0}>
        <Text color={theme.subtle}>过敏史:</Text>
        {b.allergies.length > 0 ? (
          <Badge label={b.allergies.join('、')} preset="danger" icon="⚠" />
        ) : (
          <Text color={theme.success}>无</Text>
        )}
      </Box>
      <Box flexDirection="column" marginTop={0}>
        <Text color={theme.subtle} bold>
          既往史:
        </Text>
        {b.pastHistory.map((h, i) => (
          <Text key={i} color={theme.text}>
            {'  '}· {h}
          </Text>
        ))}
      </Box>
    </Box>
  );
}

// ============================================================================
// 子视图：就诊历史
// ============================================================================

function HistoryView({ data }: { data: Patient360Data }): React.ReactElement {
  const theme = useThemeColors();
  return (
    <Box flexDirection="column">
      {data.history.map((entry, i) => (
        <Box key={i} flexDirection="row" gap={1}>
          <Text color={theme.inactive}>{entry.time}</Text>
          <Text color={theme.jianlan} bold>
            {entry.visitType}
          </Text>
          <Text color={theme.subtle}>{entry.department}</Text>
          <Text color={theme.text}>{entry.diagnosis}</Text>
          <Box flexGrow={1} />
          <Text color={theme.success}>{entry.outcome}</Text>
        </Box>
      ))}
    </Box>
  );
}

// ============================================================================
// 子视图：病历文档
// ============================================================================

function DocumentView({ data }: { data: Patient360Data }): React.ReactElement {
  const theme = useThemeColors();
  return (
    <Box flexDirection="column">
      {data.documents.map((doc, i) => (
        <Box key={i} flexDirection="row" gap={1}>
          <Text color={theme.subtle}>{doc.time}</Text>
          <Text color={theme.jianlan} bold>
            {doc.type}
          </Text>
          <Text color={theme.text}>{doc.title}</Text>
          <Text color={theme.inactive}>{doc.author}</Text>
          <Box flexGrow={1} />
          {doc.reviewed ? (
            <Badge label="已审签" preset="success" />
          ) : (
            <Badge label="待审签" preset="warning" />
          )}
        </Box>
      ))}
    </Box>
  );
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 患者 360 视图组件
 *
 * 以标签页聚合患者全维度信息：基本信息、就诊历史时间线、
 * 生命体征 7 天趋势、最近检验、活跃医嘱、病历文档。
 * 按左右箭头或数字键 1-6 切换标签。
 *
 * @example
 * ```tsx
 * <Patient360View data={patient360} />
 * ```
 */
export function Patient360View({
  data = mockPatient360,
  defaultTab = 'basic',
}: Patient360ViewProps): React.ReactElement {
  const theme = useThemeColors();
  const [activeTab, setActiveTab] = useState(defaultTab);

  const tabs = [
    { id: 'basic', label: '基本信息' },
    { id: 'history', label: '就诊历史' },
    { id: 'vitals', label: '生命体征' },
    { id: 'lab', label: '检验结果' },
    { id: 'order', label: '医嘱用药' },
    { id: 'doc', label: '病历文档' },
  ];

  const dates = data.vitalTrend.map((v) => v.date);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.border} paddingX={1}>
      <TabView tabs={tabs} activeId={activeTab} onChange={(id) => setActiveTab(id)}>
        <Box marginTop={0} />
      </TabView>

      <Box flexDirection="column" marginTop={0}>
        {activeTab === 'basic' && <BasicInfoView data={data} />}
        {activeTab === 'history' && <HistoryView data={data} />}
        {activeTab === 'vitals' && (
          <Box flexDirection="column">
            <TrendChart
              title="近7天心率/血压趋势"
              series={[
                { label: '心率', points: data.vitalTrend.map((v) => v.heartRate) },
                { label: '收缩压', points: data.vitalTrend.map((v) => v.sbp) },
              ]}
              timeLabels={dates}
              markers={[5, 6]}
            />
            <Box marginTop={0}>
              <VitalSignsPanel vitals={mockVitalSigns} />
            </Box>
          </Box>
        )}
        {activeTab === 'lab' && <LabResultPanel results={mockLabResults} />}
        {activeTab === 'order' && <OrderListPanel orders={mockOrders} />}
        {activeTab === 'doc' && <DocumentView data={data} />}
      </Box>
    </Box>
  );
}
