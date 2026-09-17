/**
 * 健澜科技数智医院智能体 - 病历查看器
 *
 * 病历内容展示（结构化字段+自由文本），标题、时间、作者信息，
 * 质控状态标记，支持滚动浏览，关键信息高亮。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text } from 'ink';
import React, { useState } from 'react';

import { useThemeColors } from '../theme';
import type { MedicalRecord, RecordQcStatus } from '../types';
import { formatDateTime } from '../utils/formatMedical';

// ============================================================================
// Mock 数据
// ============================================================================

/** 默认Mock病历数据 */
export const mockMedicalRecord: MedicalRecord = {
  recordId: 'MR20260914001',
  type: '首次病程',
  title: '首次病程记录',
  content: `患者张明华，男，58岁，因"反复胸痛3天，加重6小时"于2026-09-12 08:30急诊入院。

【主诉】反复胸痛3天，加重6小时。

【现病史】患者3天前无明显诱因出现胸骨后压榨样疼痛，持续约10分钟，休息后可缓解，未予重视。6小时前胸痛再次发作，程度较前加重，持续不缓解，伴大汗、恶心，无呕吐，含服硝酸甘油后症状稍减轻。急诊查心电图提示II、III、aVF导联ST段压低0.1-0.2mV，肌钙蛋白I 2.8ng/mL升高。以"急性冠脉综合征"收入院。

【既往史】高血压病史10年，最高血压160/100mmHg，规律服用氨氯地平5mg qd，血压控制尚可。2型糖尿病病史5年，口服二甲双胍0.5g tid，血糖控制一般。否认肝炎、结核等传染病史。青霉素过敏（皮疹）。

【个人史】吸烟30年，每日20支，未戒烟。饮酒20年，每日白酒2两。

【家族史】父亲有冠心病病史，60岁时心梗去世。

【体格检查】T 37.2℃，P 92次/分，R 20次/分，BP 145/92mmHg。神志清楚，精神尚可，口唇无紫绀。双肺呼吸音清，未闻及干湿啰音。心界不大，心率92次/分，律齐，各瓣膜听诊区未闻及病理性杂音。腹平软，无压痛，肝脾肋下未及。双下肢无水肿。

【辅助检查】
1. 心电图（2026-09-14 06:05）：窦性心律，II、III、aVF导联ST段压低0.1-0.2mV，T波倒置。
2. 肌钙蛋白I（2026-09-14 06:30）：5.2ng/mL（参考0-0.04）↑↑
3. BNP：1850pg/mL（参考0-100）↑
4. 血钾：6.8mmol/L（参考3.5-5.3）↑↑
5. 血常规：WBC 12.5×10^9/L↑，HGB 128g/L↓

【初步诊断】
1. 冠状动脉粥样硬化性心脏病
   - 急性非ST段抬高型心肌梗死
   - 心功能I级（Killip分级）
2. 高血压病2级（很高危）
3. 2型糖尿病
4. 高钾血症

【诊断依据】
1. 典型胸痛症状，持续不缓解，含服硝酸甘油效果差；
2. 心电图ST-T动态改变；
3. 肌钙蛋白I显著升高；
4. 冠心病危险因素（高血压、糖尿病、吸烟、家族史）。

【鉴别诊断】
1. 主动脉夹层：胸痛多为撕裂样，双上肢血压差异，D-二聚体升高，需CTA鉴别；
2. 肺栓塞：多有呼吸困难、咯血，D-二聚体升高，肺动脉CTA可鉴别；
3. 急性心包炎：胸痛与呼吸体位相关，心电图广泛ST段弓背向下抬高。

【诊疗计划】
1. 心内科护理常规，I级护理，低盐低脂糖尿病饮食，持续心电监护；
2. 抗血小板：阿司匹林肠溶片100mg qd + 替格瑞洛90mg bid；
3. 调脂稳定斑块：阿托伐他汀钙片20mg qn；
4. 抗凝：低分子肝素钠4000IU ih q12h；
5. 抗心肌缺血：硝酸甘油注射液5mg+NS 250mL ivgtt st，根据血压调整；
6. 降钾治疗：10%葡萄糖酸钙10mL iv st，胰岛素8U+50%葡萄糖40mL iv st；
7. 完善心脏彩超、冠脉CTA等检查，必要时冠脉造影+PCI治疗；
8. 密切监测生命体征、心电图、心肌酶、电解质变化。`,
  author: '王芳 主治医师',
  createdAt: '2026-09-14T07:00:00',
  updatedAt: '2026-09-14T07:30:00',
  qcStatus: 'submitted',
  isSigned: false,
};

// ============================================================================
// 质控状态映射
// ============================================================================

const qcStatusMap: Record<RecordQcStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'inactive' },
  submitted: { label: '已提交', color: 'info' },
  'qc-passed': { label: '质控通过', color: 'success' },
  'qc-failed': { label: '质控不通过', color: 'error' },
  signed: { label: '已签名', color: 'assistant' },
};

// ============================================================================
// 组件 Props
// ============================================================================

/** MedicalRecordViewer 属性 */
export interface MedicalRecordViewerProps {
  /** 病历数据，默认使用Mock数据 */
  record?: MedicalRecord;
  /** 最大显示高度（行数） */
  maxHeight?: number;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 病历查看器组件
 *
 * 展示结构化病历内容，包含标题、作者、时间、质控状态等元信息，
 * 支持长文本滚动浏览，关键信息（诊断、异常值）高亮显示。
 *
 * @example
 * ```tsx
 * <MedicalRecordViewer record={medicalRecord} />
 * ```
 */
export function MedicalRecordViewer({
  record = mockMedicalRecord,
  maxHeight = 20,
}: MedicalRecordViewerProps): React.ReactElement {
  const theme = useThemeColors();
  const [scrollOffset, setScrollOffset] = useState(0);

  const qcInfo = qcStatusMap[record.qcStatus];

  // 将内容按行分割
  const contentLines = record.content.split('\n');
  const totalLines = contentLines.length;
  const visibleLines = contentLines.slice(scrollOffset, scrollOffset + maxHeight);
  const canScrollUp = scrollOffset > 0;
  const canScrollDown = scrollOffset + maxHeight < totalLines;

  // 关键词高亮
  function renderLine(line: string): React.ReactNode {
    // 标题行（【】包裹）
    if (line.startsWith('【') && line.endsWith('】')) {
      return (
        <Text color={theme.jianlan} bold>
          {line}
        </Text>
      );
    }
    // 诊断编号
    if (/^\d+\./.test(line) && line.includes('诊断')) {
      return (
        <Text color={theme.assistant} bold>
          {line}
        </Text>
      );
    }
    // 异常值标记（↑↓）
    if (line.includes('↑') || line.includes('↓')) {
      return <Text color={theme.abnormalHigh}>{line}</Text>;
    }
    // 危急值（↑↑）
    if (line.includes('↑↑')) {
      return (
        <Text color={theme.criticalValue} bold>
          {line}
        </Text>
      );
    }
    return <Text color={theme.text}>{line}</Text>;
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.border}
      paddingX={1}
      paddingY={0}
    >
      {/* 标题栏 */}
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Text color={theme.jianlan} bold>
          📄
        </Text>
        <Text color={theme.text} bold>
          {record.title}
        </Text>
        <Text color={theme.subtle}>[{record.type}]</Text>
        <Text
          color={theme[qcInfo.color as keyof typeof theme]}
          bold
          backgroundColor={theme.panelBackground}
        >
          {' '}
          {qcInfo.label}{' '}
        </Text>
        {record.isSigned && (
          <Text color={theme.assistant}>✓ 已签名: {record.signedBy ?? record.author}</Text>
        )}
      </Box>

      {/* 元信息 */}
      <Box flexDirection="row" gap={3} marginTop={0}>
        <Text color={theme.subtle}>
          作者: <Text color={theme.text}>{record.author}</Text>
        </Text>
        <Text color={theme.subtle}>
          创建: <Text color={theme.text}>{formatDateTime(record.createdAt)}</Text>
        </Text>
        <Text color={theme.subtle}>
          修改: <Text color={theme.text}>{formatDateTime(record.updatedAt)}</Text>
        </Text>
      </Box>

      {/* 质控意见 */}
      {record.qcComment && (
        <Box marginTop={0}>
          <Text color={theme.warning}>质控意见: {record.qcComment}</Text>
        </Box>
      )}

      {/* 分隔线 */}
      <Box marginTop={0}>
        <Text color={theme.divider}>
          ──────────────────────────────────────────────────────────
        </Text>
      </Box>

      {/* 内容区域 */}
      <Box flexDirection="column" marginTop={0}>
        {visibleLines.map((line, i) => (
          <Box key={scrollOffset + i} flexDirection="row">
            <Box width={4}>
              <Text color={theme.inactive}>{scrollOffset + i + 1}</Text>
            </Box>
            {renderLine(line)}
          </Box>
        ))}
      </Box>

      {/* 滚动控制 */}
      <Box flexDirection="row" justifyContent="space-between" marginTop={0}>
        <Text color={theme.inactive}>
          显示 {scrollOffset + 1}-{Math.min(scrollOffset + maxHeight, totalLines)}/{totalLines} 行
        </Text>
        <Box flexDirection="row" gap={2}>
          <Box>
            <Text color={canScrollUp ? theme.suggestion : theme.inactive} underline={canScrollUp}>
              ▲ 上翻
            </Text>
          </Box>
          <Box>
            <Text
              color={canScrollDown ? theme.suggestion : theme.inactive}
              underline={canScrollDown}
            >
              下翻 ▼
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
