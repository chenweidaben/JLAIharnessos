/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * ECharts 主题配色（健澜深海蓝体系）
 */
export const jlChartColors = [
  '#0A4D8C',
  '#1890FF',
  '#13C2C2',
  '#52C41A',
  '#FAAD14',
  '#F5222D',
  '#722ED1',
  '#EB2F96',
];

export const baseTextStyle = {
  color: '#262626',
  fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
};

export function baseTooltip() {
  return {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: '#E8ECF1',
    textStyle: { color: '#262626', fontSize: 12 },
  };
}
