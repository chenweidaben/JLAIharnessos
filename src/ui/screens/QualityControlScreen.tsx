/**
 * 健澜科技数智医院智能体 - 病历质控工作台屏幕
 *
 * 三栏质控工作台：左栏质控任务列表，中栏病历详情/缺陷标注/整改建议，
 * 右栏质控统计指标与缺陷类型分布。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';

import { Badge } from '../components/common/Badge';
import { ProgressBar } from '../components/common/ProgressBar';
import { FooterBar } from '../components/layout/FooterBar';
import { HeaderBar } from '../components/layout/HeaderBar';
import { ThreeColumnLayout } from '../components/layout/ThreeColumnLayout';
import { useThemeColors } from '../theme';

// ============================================================================
// Mock 数据
// ============================================================================

/** 质控任务状态 */
export type QcTaskStatus = 'pending' | 'defect' | 'passed';

/** 质控任务 */
export interface QcTask {
  /** 任务 id */
  id: string;
  /** 病历标题 */
  title: string;
  /** 科室 */
  department: string;
  /** 主治医师 */
  doctor: string;
  /** 提交时间 */
  submittedAt: string;
  /** 状态 */
  status: QcTaskStatus;
  /** 缺陷数 */
  defectCount: number;
  /** 病历摘要 */
  summary: string;
  /** 缺陷标注 */
  defects: string[];
  /** 适用质控规则 */
  rules: string[];
  /** 整改建议 */
  suggestion: string;
}

/** 默认 Mock 质控任务（8 份待质控病历） */
export const mockQcTasks: QcTask[] = [
  {
    id: 'QC001',
    title: '入院记录-王某某',
    department: '心血管内科',
    doctor: '李建国',
    submittedAt: '2026-09-14 08:20',
    status: 'defect',
    defectCount: 3,
    summary: '患者因“反复胸痛3天”入院。现病史描述完整，但既往史与体格检查缺失部分内容。',
    defects: ['既往史缺失高血压病程', '体格检查记录不完整', '首次病程缺鉴别诊断'],
    rules: ['病历书写规范-入院记录', '核心制度-三级查房'],
    suggestion: '补充既往高血压病程及用药，完善体格检查阴性体征，补充鉴别诊断至少3项。',
  },
  {
    id: 'QC002',
    title: '日常病程记录-刘某某',
    department: '心血管内科',
    doctor: '王芳',
    submittedAt: '2026-09-14 09:05',
    status: 'pending',
    defectCount: 0,
    summary: '今日查房患者胸痛较前减轻，生命体征平稳，继续当前治疗方案。',
    defects: [],
    rules: ['日常病程记录规范'],
    suggestion: '病程记录较简略，建议补充检验结果分析与下一步计划。',
  },
  {
    id: 'QC003',
    title: '手术记录-陈某某',
    department: '普外科',
    doctor: '张伟',
    submittedAt: '2026-09-13 16:40',
    status: 'defect',
    defectCount: 2,
    summary: '腹腔镜胆囊切除术手术记录，手术经过记录完整，出血量描述缺失。',
    defects: ['术中出血量未量化', '标本处理记录缺失'],
    rules: ['手术记录书写规范'],
    suggestion: '补充术中出血量(约mL)与标本送病理描述。',
  },
  {
    id: 'QC004',
    title: '出院记录-周某某',
    department: '呼吸内科',
    doctor: '赵敏',
    submittedAt: '2026-09-13 11:10',
    status: 'passed',
    defectCount: 0,
    summary: '社区获得性肺炎治疗好转出院，出院医嘱、随访计划完整。',
    defects: [],
    rules: ['出院记录规范'],
    suggestion: '质控通过，甲级病历。',
  },
  {
    id: 'QC005',
    title: '首次病程记录-吴某某',
    department: '神经内科',
    doctor: '孙磊',
    submittedAt: '2026-09-14 10:30',
    status: 'pending',
    defectCount: 0,
    summary: '脑梗死入院首次病程，病例特点、诊断依据、诊疗计划齐全。',
    defects: [],
    rules: ['首次病程记录规范'],
    suggestion: '暂未发现缺陷，待人工复核。',
  },
  {
    id: 'QC006',
    title: '上级医师查房-郑某某',
    department: '心血管内科',
    doctor: '李建国',
    submittedAt: '2026-09-13 15:00',
    status: 'defect',
    defectCount: 1,
    summary: '主任医师查房记录，查房意见记录完整但缺签字。',
    defects: ['上级医师查房未签字'],
    rules: ['三级查房制度'],
    suggestion: '请主任医师及时审签。',
  },
  {
    id: 'QC007',
    title: '会诊记录-冯某某',
    department: '内分泌科',
    doctor: '钱进',
    submittedAt: '2026-09-12 14:00',
    status: 'passed',
    defectCount: 0,
    summary: '内分泌科会诊记录完整，会诊意见具体可执行。',
    defects: [],
    rules: ['会诊制度'],
    suggestion: '质控通过。',
  },
  {
    id: 'QC008',
    title: '知情同意书-朱某某',
    department: '骨科',
    doctor: '林涛',
    submittedAt: '2026-09-14 09:50',
    status: 'pending',
    defectCount: 0,
    summary: '手术知情同意书已签署，风险告知项完整。',
    defects: [],
    rules: ['知情同意制度'],
    suggestion: '待质控。',
  },
];

/** 状态映射 */
const STATUS_MAP: Record<
  QcTaskStatus,
  { label: string; preset: 'warning' | 'danger' | 'success' }
> = {
  pending: { label: '待质控', preset: 'warning' },
  defect: { label: '有缺陷', preset: 'danger' },
  passed: { label: '已通过', preset: 'success' },
};

/** 缺陷类型分布 */
const DEFECT_DIST = [
  { name: '内容缺失', count: 5 },
  { name: '记录不完整', count: 3 },
  { name: '未签字', count: 2 },
  { name: '鉴别诊断不足', count: 1 },
];

// ============================================================================
// 组件 Props
// ============================================================================

/** QualityControlScreen 属性 */
export interface QualityControlScreenProps {
  /** 质控任务列表，默认 Mock */
  tasks?: QcTask[];
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 病历质控工作台屏幕
 *
 * 左栏按状态分组展示待质控病历，中栏展示病历摘要、缺陷标注与整改建议，
 * 右栏展示质控率、甲级率与缺陷类型分布统计。↑↓ 键切换病历。
 *
 * @example
 * ```tsx
 * <QualityControlScreen tasks={qcTasks} />
 * ```
 */
export function QualityControlScreen({
  tasks = mockQcTasks,
}: QualityControlScreenProps): React.ReactElement {
  const theme = useThemeColors();
  const [selected, setSelected] = useState(0);

  const current = tasks[Math.min(selected, tasks.length - 1)];

  useInput(
    (_input, key) => {
      if (key.upArrow) setSelected((i) => Math.max(0, i - 1));
      else if (key.downArrow) setSelected((i) => Math.min(tasks.length - 1, i + 1));
    },
    { isActive: true },
  );

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const defectCount = tasks.filter((t) => t.status === 'defect').length;
  const passedCount = tasks.filter((t) => t.status === 'passed').length;
  const passRate = Math.round((passedCount / tasks.length) * 100);
  const gradeARate = 86;

  return (
    <Box flexDirection="column" flexGrow={1}>
      <HeaderBar
        title="病历质控工作台"
        subtitle="Medical Record QC"
        rightStatus={`质控组 · 今日${tasks.length}份`}
      />

      <ThreeColumnLayout
        left={
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={theme.border}
            paddingX={1}
            flexGrow={1}
          >
            <Text color={theme.jianlan} bold>
              📋 质控任务
            </Text>
            {tasks.map((task, i) => {
              const st = STATUS_MAP[task.status];
              const active = i === selected;
              return (
                <Box
                  key={task.id}
                  flexDirection="column"
                  backgroundColor={active ? theme.hoverBackground : undefined}
                  borderStyle={active ? 'single' : undefined}
                  borderColor={active ? theme.borderFocus : undefined}
                  paddingX={0}
                >
                  <Text color={active ? theme.text : theme.subtle} bold={active}>
                    {active ? '▶ ' : '  '}
                    {task.title}
                  </Text>
                  <Text color={theme.inactive}>
                    {'  '}
                    {task.department} · {task.doctor}
                  </Text>
                  <Box flexDirection="row" gap={1}>
                    <Box marginLeft={2}>
                      <Badge label={st.label} preset={st.preset} />
                    </Box>
                    {task.defectCount > 0 && (
                      <Text color={theme.criticalValue}>{task.defectCount}项缺陷</Text>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        }
        middle={
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={theme.border}
            paddingX={1}
            flexGrow={1}
          >
            <Box flexDirection="row" gap={1}>
              <Text color={theme.text} bold>
                {current.title}
              </Text>
              <Badge
                label={STATUS_MAP[current.status].label}
                preset={STATUS_MAP[current.status].preset}
              />
            </Box>
            <Text color={theme.inactive}>
              {current.department} · {current.doctor} · {current.submittedAt}
            </Text>

            <Box flexDirection="column" marginTop={0}>
              <Text color={theme.subtle} bold>
                病历摘要
              </Text>
              <Text color={theme.text}>{current.summary}</Text>
            </Box>

            <Box flexDirection="column" marginTop={0}>
              <Text color={theme.criticalValue} bold>
                缺陷标注 ({current.defects.length})
              </Text>
              {current.defects.length === 0 && <Text color={theme.success}>✓ 无缺陷</Text>}
              {current.defects.map((d, i) => (
                <Text key={i} color={theme.abnormalHigh}>
                  {'  '}✕ {d}
                </Text>
              ))}
            </Box>

            <Box flexDirection="column" marginTop={0}>
              <Text color={theme.subtle} bold>
                质控规则
              </Text>
              {current.rules.map((r, i) => (
                <Text key={i} color={theme.assistant}>
                  {'  '}· {r}
                </Text>
              ))}
            </Box>

            <Box flexDirection="column" marginTop={0}>
              <Text color={theme.suggestion} bold>
                💡 整改建议
              </Text>
              <Text color={theme.text}>{current.suggestion}</Text>
            </Box>
          </Box>
        }
        right={
          <Box flexDirection="column" borderStyle="round" borderColor={theme.border} paddingX={1}>
            <Text color={theme.jianlan} bold>
              📊 质控统计
            </Text>
            <ProgressBar value={passRate} label="质控率" />
            <ProgressBar value={gradeARate} label="甲级率" />
            <Box flexDirection="row" gap={3} marginTop={0}>
              <Text color={theme.warning}>待质控 {pendingCount}</Text>
              <Text color={theme.criticalValue}>缺陷 {defectCount}</Text>
              <Text color={theme.success}>通过 {passedCount}</Text>
            </Box>

            <Box flexDirection="column" marginTop={0}>
              <Text color={theme.subtle} bold>
                缺陷类型分布
              </Text>
              {DEFECT_DIST.map((d) => (
                <Box key={d.name} flexDirection="row" gap={1}>
                  <Box width={14}>
                    <Text color={theme.text}>{d.name}</Text>
                  </Box>
                  <Text color={theme.abnormalHigh}>{'█'.repeat(d.count)}</Text>
                  <Text color={theme.inactive}>{d.count}</Text>
                </Box>
              ))}
            </Box>
          </Box>
        }
      />

      <FooterBar
        shortcuts={[
          { key: '↑↓', label: '切换病历' },
          { key: '→', label: '处理' },
        ]}
        pendingCount={pendingCount}
      />
    </Box>
  );
}
