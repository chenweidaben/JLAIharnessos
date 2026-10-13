/**
 * 健澜科技 jlmedaios - PICC 维护展示工具（M68-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export const COMPLICATION_LABEL: Record<string, string> = {
  none: '无',
  thrombosis: '血栓',
  infection: '感染',
  dislodged: '脱出',
  occluded: '堵管',
};

export const COMPLICATION_COLOR: Record<string, string> = {
  none: 'green',
  thrombosis: 'red',
  infection: 'red',
  dislodged: 'orange',
  occluded: 'orange',
};

export const DEVICE_TYPE_LABEL: Record<string, string> = {
  picc: 'PICC',
  port: '输液港',
};
