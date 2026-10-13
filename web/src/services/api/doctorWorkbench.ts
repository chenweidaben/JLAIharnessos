/**
 * 健澜科技 jlmedaios - 医生站工作台 API（M79-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { get } from '../request';
import type { WorkbenchView } from '@/types/doctorWorkbench';

export function getDoctorWorkbench() {
  return get<WorkbenchView>('/doctor/workbench');
}
