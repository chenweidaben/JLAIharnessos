/**
 * 健澜科技数智医院智能体 - 检验结果面板
 *
 * 展示检验项目列表，异常值标记，危急值特殊标记，
 * 支持按类别筛选和分页显示。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';

import { useThemeColors } from '../theme';
import type { LabCategory, LabResultItem } from '../types';
import { formatDateTime, getAbnormalFlagSymbol } from '../utils/formatMedical';

// ============================================================================
// Mock 数据
// ============================================================================

/** 默认Mock检验结果数据 */
export const mockLabResults: LabResultItem[] = [
  {
    code: 'WBC',
    name: '白细胞计数',
    value: '12.5',
    unit: '10^9/L',
    referenceRange: '3.5-9.5',
    abnormalFlag: 'high',
    isCritical: false,
    category: '血常规',
    reportedAt: '2026-09-14T06:30:00',
    instrument: 'XN-9000',
  },
  {
    code: 'RBC',
    name: '红细胞计数',
    value: '4.2',
    unit: '10^12/L',
    referenceRange: '4.3-5.8',
    abnormalFlag: 'low',
    isCritical: false,
    category: '血常规',
    reportedAt: '2026-09-14T06:30:00',
    instrument: 'XN-9000',
  },
  {
    code: 'HGB',
    name: '血红蛋白',
    value: '128',
    unit: 'g/L',
    referenceRange: '130-175',
    abnormalFlag: 'low',
    isCritical: false,
    category: '血常规',
    reportedAt: '2026-09-14T06:30:00',
    instrument: 'XN-9000',
  },
  {
    code: 'PLT',
    name: '血小板计数',
    value: '185',
    unit: '10^9/L',
    referenceRange: '125-350',
    abnormalFlag: 'normal',
    isCritical: false,
    category: '血常规',
    reportedAt: '2026-09-14T06:30:00',
    instrument: 'XN-9000',
  },
  {
    code: 'K',
    name: '血钾',
    value: '6.8',
    unit: 'mmol/L',
    referenceRange: '3.5-5.3',
    abnormalFlag: 'critical-high',
    isCritical: true,
    category: '生化',
    reportedAt: '2026-09-14T06:30:00',
    instrument: 'AU5800',
  },
  {
    code: 'NA',
    name: '血钠',
    value: '138',
    unit: 'mmol/L',
    referenceRange: '137-147',
    abnormalFlag: 'normal',
    isCritical: false,
    category: '生化',
    reportedAt: '2026-09-14T06:30:00',
    instrument: 'AU5800',
  },
  {
    code: 'CREA',
    name: '肌酐',
    value: '128',
    unit: 'μmol/L',
    referenceRange: '57-97',
    abnormalFlag: 'high',
    isCritical: false,
    category: '生化',
    reportedAt: '2026-09-14T06:30:00',
    instrument: 'AU5800',
  },
  {
    code: 'BNP',
    name: 'B型钠尿肽',
    value: '1850',
    unit: 'pg/mL',
    referenceRange: '0-100',
    abnormalFlag: 'high',
    isCritical: false,
    category: '免疫',
    reportedAt: '2026-09-14T07:15:00',
    instrument: 'Architect i2000',
  },
  {
    code: 'TNI',
    name: '肌钙蛋白I',
    value: '5.2',
    unit: 'ng/mL',
    referenceRange: '0-0.04',
    abnormalFlag: 'critical-high',
    isCritical: true,
    category: '免疫',
    reportedAt: '2026-09-14T07:15:00',
    instrument: 'Architect i2000',
  },
  {
    code: 'PT',
    name: '凝血酶原时间',
    value: '13.5',
    unit: '秒',
    referenceRange: '11-14',
    abnormalFlag: 'normal',
    isCritical: false,
    category: '凝血',
    reportedAt: '2026-09-14T06:45:00',
    instrument: 'CS-5100',
  },
];

/** 可用检验类别 */
const LAB_CATEGORIES: ('全部' | LabCategory)[] = ['全部', '血常规', '生化', '免疫', '凝血'];

/** 每页显示数量 */
const PAGE_SIZE = 8;

// ============================================================================
// 组件 Props
// ============================================================================

/** LabResultPanel 属性 */
export interface LabResultPanelProps {
  /** 检验结果数据，默认使用Mock数据 */
  results?: LabResultItem[];
  /** 面板标题 */
  title?: string;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 检验结果面板组件
 *
 * 展示患者的检验结果列表，支持按类别筛选，异常值用↑↓箭头标记，
 * 危急值以红色背景闪烁特殊标记。支持分页显示。
 *
 * @example
 * ```tsx
 * <LabResultPanel results={labResults} />
 * ```
 */
export function LabResultPanel({
  results = mockLabResults,
  title = '检验结果',
}: LabResultPanelProps): React.ReactElement {
  const theme = useThemeColors();
  const [selectedCategory, setSelectedCategory] = useState<'全部' | LabCategory>('全部');
  const [abnormalOnly, setAbnormalOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // 按类别 + 仅异常筛选
  const filteredResults = results
    .filter((r) => (selectedCategory === '全部' ? true : r.category === selectedCategory))
    .filter((r) => (abnormalOnly ? r.abnormalFlag !== 'normal' : true));

  // 分页
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE));
  const pageResults = filteredResults.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  // 统计
  const criticalCount = results.filter((r) => r.isCritical).length;
  const abnormalCount = results.filter((r) => r.abnormalFlag !== 'normal').length;

  // 按键 a/A 切换“仅看异常”
  useInput((input) => {
    if (input === 'a' || input === 'A') {
      setAbnormalOnly((v) => !v);
      setCurrentPage(0);
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.border}
      paddingX={1}
      paddingY={0}
    >
      {/* 标题行 */}
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Text color={theme.jianlan} bold>
          🔬
        </Text>
        <Text color={theme.text} bold>
          {title}
        </Text>
        {criticalCount > 0 && (
          <Text color={theme.criticalValue} bold backgroundColor={theme.criticalValueBg}>
            {' '}
            {criticalCount}项危急{' '}
          </Text>
        )}
        {abnormalCount > 0 && <Text color={theme.abnormalHigh}>({abnormalCount}项异常)</Text>}
      </Box>

      {/* 类别筛选标签 */}
      <Box flexDirection="row" gap={1} marginTop={0}>
        {LAB_CATEGORIES.map((cat) => (
          <Box key={cat}>
            <Text
              color={selectedCategory === cat ? theme.tabActive : theme.inactive}
              bold={selectedCategory === cat}
              underline={selectedCategory === cat}
            >
              [{cat}]
            </Text>
          </Box>
        ))}
        <Box marginLeft={1}>
          <Text
            color={abnormalOnly ? theme.abnormalHigh : theme.inactive}
            bold={abnormalOnly}
            underline={abnormalOnly}
          >
            [仅异常 {abnormalOnly ? 'ON' : 'OFF'}·A]
          </Text>
        </Box>
      </Box>

      {/* 表头 */}
      <Box flexDirection="row" gap={1} marginTop={0}>
        <Box width={16}>
          <Text color={theme.inactive} bold>
            项目
          </Text>
        </Box>
        <Box width={12}>
          <Text color={theme.inactive} bold>
            结果
          </Text>
        </Box>
        <Box width={4}>
          <Text color={theme.inactive} bold>
            标记
          </Text>
        </Box>
        <Box width={16}>
          <Text color={theme.inactive} bold>
            参考范围
          </Text>
        </Box>
        <Box width={8}>
          <Text color={theme.inactive} bold>
            类别
          </Text>
        </Box>
        <Box width={14}>
          <Text color={theme.inactive} bold>
            报告时间
          </Text>
        </Box>
      </Box>

      {/* 分隔线 */}
      <Box>
        <Text color={theme.divider}>
          ──────────────────────────────────────────────────────────
        </Text>
      </Box>

      {/* 数据行 */}
      {pageResults.map((item) => {
        const flag = getAbnormalFlagSymbol(item.abnormalFlag);
        const isAbnormal = item.abnormalFlag !== 'normal';
        const valueColor = item.isCritical
          ? theme.criticalValue
          : isAbnormal
            ? theme.abnormalHigh
            : theme.text;

        return (
          <Box key={item.code} flexDirection="row" gap={1}>
            <Box width={16}>
              <Text color={theme.text}>{item.name}</Text>
            </Box>
            <Box width={12}>
              <Text
                color={valueColor}
                bold={isAbnormal}
                backgroundColor={item.isCritical ? theme.criticalValueBg : undefined}
              >
                {item.value} {item.unit}
              </Text>
            </Box>
            <Box width={4}>
              <Text color={valueColor} bold>
                {flag}
              </Text>
            </Box>
            <Box width={16}>
              <Text color={theme.inactive}>{item.referenceRange}</Text>
            </Box>
            <Box width={8}>
              <Text color={theme.subtle}>{item.category}</Text>
            </Box>
            <Box width={14}>
              <Text color={theme.inactive}>{formatDateTime(item.reportedAt)}</Text>
            </Box>
          </Box>
        );
      })}

      {/* 分页控制 */}
      <Box flexDirection="row" justifyContent="space-between" marginTop={0}>
        <Text color={theme.inactive}>共 {filteredResults.length} 项</Text>
        <Box flexDirection="row" gap={2}>
          <Box>
            <Text
              color={currentPage > 0 ? theme.suggestion : theme.inactive}
              underline={currentPage > 0}
            >
              ◀ 上一页
            </Text>
          </Box>
          <Text color={theme.text}>
            {currentPage + 1}/{totalPages}
          </Text>
          <Box>
            <Text
              color={currentPage < totalPages - 1 ? theme.suggestion : theme.inactive}
              underline={currentPage < totalPages - 1}
            >
              下一页 ▶
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
