/**
 * 健澜科技 jlmedaios - 患者端（小程序/演示）API（M3-Q）
 *
 * 患者登录、就诊人、代办授权；相对路径。
 * 真实载体为微信小程序，Web 端提供演示登录入口。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { PatientProfileView } from '@/types/internetHospital';

/** 患者登录（微信 code；本地演示任意 code 派生账号）。 */
export async function patientLoginApi(code: string): Promise<{
  token: string;
  accountId: string;
  isDemoLogin: boolean;
  profileCount: number;
}> {
  return post(`/internet/patient/login`, { code });
}

/** 列出当前账号下就诊人。 */
export async function listMyProfilesApi(): Promise<PatientProfileView[]> {
  return get(`/internet/patient/profiles`);
}

/** 添加就诊人（演示）。 */
export async function addProfileApi(input: {
  relation: PatientProfileView['relation'];
  name: string;
  gender?: '男' | '女' | '未知';
  birthDate?: string;
}): Promise<{ id: string; authLevel: number }> {
  return post(`/internet/patient/profiles`, input);
}
