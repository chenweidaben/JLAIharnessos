/**
 * 健澜科技数智医院智能体 - integration/adapters/lis/LISMockAdapter.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - LIS Mock适配器
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 实现LISAdapter接口，返回模拟检验数据（血常规、生化、心肌酶等，
 * 含异常值和危急值）。
 *
 * @module integration/adapters/lis/LISMockAdapter
 */

import type { AdapterMetadata, Unsubscribe } from '../../types';
import { createDefaultAdapterConfig } from '../AdapterConfig';
import { AdapterError, AdapterErrorCode } from '../AdapterError';
import { BaseAdapter } from '../BaseAdapter';
import type {
  CriticalValueEvent,
  LabOrderRequest,
  LabOrderResult,
  LabReport,
  LabResultItem,
  LabTestCatalogItem,
  LISAdapter,
} from './LISAdapter';

/**
 * LIS Mock适配器
 */
export class LISMockAdapter extends BaseAdapter implements LISAdapter {
  private reports = new Map<string, LabReport>();
  private catalog = new Map<string, LabTestCatalogItem>();
  private criticalValueListeners = new Map<string, (event: CriticalValueEvent) => void>();
  private orderCounter = 0;
  private subscriptionCounter = 0;

  constructor() {
    const config = createDefaultAdapterConfig({
      id: 'lis-mock',
      type: 'lis',
      vendor: 'mock',
      version: '1.0.0',
      name: 'LIS Mock适配器',
      endpoint: 'mock://lis',
      timeout: 5000,
    });
    super(config);
  }

  getMetadata(): AdapterMetadata {
    return {
      id: this.config.id,
      type: 'lis',
      vendor: 'mock',
      version: '1.0.0',
      name: 'LIS Mock适配器',
      description: '模拟LIS系统，返回血常规、生化、心肌酶等检验数据',
      supportedProtocols: ['mock'],
    };
  }

  protected override async onInit(): Promise<void> {
    this.seedCatalog();
    this.seedReports();
  }

  private seedCatalog(): void {
    const items: LabTestCatalogItem[] = [
      // 血常规
      {
        itemCode: 'CBC001',
        itemName: '白细胞计数',
        itemShortName: 'WBC',
        loincCode: '6690-2',
        specimenType: '全血',
        department: '检验科',
        referenceRange: '3.5-9.5',
        unit: '×10^9/L',
        price: 5,
        turnaroundTime: 30,
        isAvailable: true,
        category: '血常规',
      },
      {
        itemCode: 'CBC002',
        itemName: '红细胞计数',
        itemShortName: 'RBC',
        loincCode: '789-8',
        specimenType: '全血',
        department: '检验科',
        referenceRange: '4.3-5.8',
        unit: '×10^12/L',
        price: 5,
        turnaroundTime: 30,
        isAvailable: true,
        category: '血常规',
      },
      {
        itemCode: 'CBC003',
        itemName: '血红蛋白',
        itemShortName: 'HGB',
        loincCode: '718-7',
        specimenType: '全血',
        department: '检验科',
        referenceRange: '130-175',
        unit: 'g/L',
        price: 5,
        turnaroundTime: 30,
        isAvailable: true,
        category: '血常规',
      },
      {
        itemCode: 'CBC004',
        itemName: '血小板计数',
        itemShortName: 'PLT',
        loincCode: '777-3',
        specimenType: '全血',
        department: '检验科',
        referenceRange: '125-350',
        unit: '×10^9/L',
        price: 5,
        turnaroundTime: 30,
        isAvailable: true,
        category: '血常规',
      },
      {
        itemCode: 'CBC005',
        itemName: '中性粒细胞百分比',
        itemShortName: 'NEUT%',
        loincCode: '770-8',
        specimenType: '全血',
        department: '检验科',
        referenceRange: '40-75',
        unit: '%',
        price: 3,
        turnaroundTime: 30,
        isAvailable: true,
        category: '血常规',
      },
      // 生化
      {
        itemCode: 'BIO001',
        itemName: '谷丙转氨酶',
        itemShortName: 'ALT',
        loincCode: '1742-6',
        specimenType: '血清',
        department: '检验科',
        referenceRange: '9-50',
        unit: 'U/L',
        price: 8,
        turnaroundTime: 60,
        isAvailable: true,
        category: '肝功能',
      },
      {
        itemCode: 'BIO002',
        itemName: '谷草转氨酶',
        itemShortName: 'AST',
        loincCode: '1920-8',
        specimenType: '血清',
        department: '检验科',
        referenceRange: '15-40',
        unit: 'U/L',
        price: 8,
        turnaroundTime: 60,
        isAvailable: true,
        category: '肝功能',
      },
      {
        itemCode: 'BIO003',
        itemName: '肌酐',
        itemShortName: 'CREA',
        loincCode: '2160-0',
        specimenType: '血清',
        department: '检验科',
        referenceRange: '57-97',
        unit: 'μmol/L',
        price: 6,
        turnaroundTime: 60,
        isAvailable: true,
        category: '肾功能',
      },
      {
        itemCode: 'BIO004',
        itemName: '尿素氮',
        itemShortName: 'BUN',
        loincCode: '3094-0',
        specimenType: '血清',
        department: '检验科',
        referenceRange: '3.1-8.0',
        unit: 'mmol/L',
        price: 6,
        turnaroundTime: 60,
        isAvailable: true,
        category: '肾功能',
      },
      {
        itemCode: 'BIO005',
        itemName: '空腹血糖',
        itemShortName: 'GLU',
        loincCode: '1558-6',
        specimenType: '血浆',
        department: '检验科',
        referenceRange: '3.9-6.1',
        unit: 'mmol/L',
        price: 5,
        turnaroundTime: 30,
        isAvailable: true,
        category: '血糖',
      },
      {
        itemCode: 'BIO006',
        itemName: '总胆固醇',
        itemShortName: 'TC',
        loincCode: '2093-3',
        specimenType: '血清',
        department: '检验科',
        referenceRange: '<5.2',
        unit: 'mmol/L',
        price: 8,
        turnaroundTime: 60,
        isAvailable: true,
        category: '血脂',
      },
      {
        itemCode: 'BIO007',
        itemName: '甘油三酯',
        itemShortName: 'TG',
        loincCode: '2571-8',
        specimenType: '血清',
        department: '检验科',
        referenceRange: '<1.7',
        unit: 'mmol/L',
        price: 8,
        turnaroundTime: 60,
        isAvailable: true,
        category: '血脂',
      },
      // 心肌酶
      {
        itemCode: 'CAR001',
        itemName: '肌钙蛋白I',
        itemShortName: 'cTnI',
        loincCode: '42757-5',
        specimenType: '血清',
        department: '检验科',
        referenceRange: '0-0.04',
        unit: 'ng/mL',
        price: 80,
        turnaroundTime: 45,
        isAvailable: true,
        category: '心肌损伤标志物',
      },
      {
        itemCode: 'CAR002',
        itemName: '肌酸激酶同工酶',
        itemShortName: 'CK-MB',
        loincCode: '2157-6',
        specimenType: '血清',
        department: '检验科',
        referenceRange: '0-25',
        unit: 'U/L',
        price: 30,
        turnaroundTime: 45,
        isAvailable: true,
        category: '心肌酶谱',
      },
      {
        itemCode: 'CAR003',
        itemName: '肌红蛋白',
        itemShortName: 'MYO',
        loincCode: '10759-7',
        specimenType: '血清',
        department: '检验科',
        referenceRange: '0-70',
        unit: 'ng/mL',
        price: 30,
        turnaroundTime: 45,
        isAvailable: true,
        category: '心肌损伤标志物',
      },
      {
        itemCode: 'CAR004',
        itemName: 'B型钠尿肽前体',
        itemShortName: 'NT-proBNP',
        loincCode: '33762-6',
        specimenType: '血浆',
        department: '检验科',
        referenceRange: '0-125',
        unit: 'pg/mL',
        price: 120,
        turnaroundTime: 60,
        isAvailable: true,
        category: '心功能',
      },
      // 凝血
      {
        itemCode: 'COA001',
        itemName: '凝血酶原时间',
        itemShortName: 'PT',
        loincCode: '5902-2',
        specimenType: '血浆',
        department: '检验科',
        referenceRange: '11-14',
        unit: '秒',
        price: 15,
        turnaroundTime: 45,
        isAvailable: true,
        category: '凝血功能',
      },
      {
        itemCode: 'COA002',
        itemName: '活化部分凝血活酶时间',
        itemShortName: 'APTT',
        loincCode: '5902-2',
        specimenType: '血浆',
        department: '检验科',
        referenceRange: '25-35',
        unit: '秒',
        price: 15,
        turnaroundTime: 45,
        isAvailable: true,
        category: '凝血功能',
      },
      // 尿常规
      {
        itemCode: 'URN001',
        itemName: '尿蛋白',
        itemShortName: 'PRO',
        loincCode: '2888-6',
        specimenType: '尿液',
        department: '检验科',
        referenceRange: '阴性',
        unit: '',
        price: 5,
        turnaroundTime: 30,
        isAvailable: true,
        category: '尿常规',
      },
      {
        itemCode: 'URN002',
        itemName: '尿糖',
        itemShortName: 'GLU-U',
        loincCode: '2342-4',
        specimenType: '尿液',
        department: '检验科',
        referenceRange: '阴性',
        unit: '',
        price: 5,
        turnaroundTime: 30,
        isAvailable: true,
        category: '尿常规',
      },
      {
        itemCode: 'URN003',
        itemName: '尿潜血',
        itemShortName: 'BLD',
        loincCode: '5794-3',
        specimenType: '尿液',
        department: '检验科',
        referenceRange: '阴性',
        unit: '',
        price: 5,
        turnaroundTime: 30,
        isAvailable: true,
        category: '尿常规',
      },
      // 免疫
      {
        itemCode: 'IMM001',
        itemName: '乙肝表面抗原',
        itemShortName: 'HBsAg',
        loincCode: '5196-1',
        specimenType: '血清',
        department: '检验科',
        referenceRange: '阴性',
        unit: '',
        price: 30,
        turnaroundTime: 120,
        isAvailable: true,
        category: '感染免疫',
      },
      {
        itemCode: 'IMM002',
        itemName: 'C反应蛋白',
        itemShortName: 'CRP',
        loincCode: '1988-5',
        specimenType: '血清',
        department: '检验科',
        referenceRange: '0-10',
        unit: 'mg/L',
        price: 25,
        turnaroundTime: 60,
        isAvailable: true,
        category: '炎症指标',
      },
      {
        itemCode: 'IMM003',
        itemName: '降钙素原',
        itemShortName: 'PCT',
        loincCode: '33959-8',
        specimenType: '血清',
        department: '检验科',
        referenceRange: '0-0.05',
        unit: 'ng/mL',
        price: 100,
        turnaroundTime: 60,
        isAvailable: true,
        category: '炎症指标',
      },
      // 激素
      {
        itemCode: 'HOR001',
        itemName: '促甲状腺激素',
        itemShortName: 'TSH',
        loincCode: '3016-3',
        specimenType: '血清',
        department: '检验科',
        referenceRange: '0.27-4.2',
        unit: 'mIU/L',
        price: 40,
        turnaroundTime: 120,
        isAvailable: true,
        category: '内分泌',
      },
      {
        itemCode: 'HOR002',
        itemName: '游离甲状腺素',
        itemShortName: 'FT4',
        loincCode: '3024-7',
        specimenType: '血清',
        department: '检验科',
        referenceRange: '12-22',
        unit: 'pmol/L',
        price: 40,
        turnaroundTime: 120,
        isAvailable: true,
        category: '内分泌',
      },
      // 电解质
      {
        itemCode: 'ELE001',
        itemName: '钾',
        itemShortName: 'K+',
        loincCode: '2823-3',
        specimenType: '血清',
        department: '检验科',
        referenceRange: '3.5-5.3',
        unit: 'mmol/L',
        price: 5,
        turnaroundTime: 30,
        isAvailable: true,
        category: '电解质',
      },
      {
        itemCode: 'ELE002',
        itemName: '钠',
        itemShortName: 'Na+',
        loincCode: '2951-2',
        specimenType: '血清',
        department: '检验科',
        referenceRange: '137-147',
        unit: 'mmol/L',
        price: 5,
        turnaroundTime: 30,
        isAvailable: true,
        category: '电解质',
      },
      {
        itemCode: 'ELE003',
        itemName: '氯',
        itemShortName: 'Cl-',
        loincCode: '2075-0',
        specimenType: '血清',
        department: '检验科',
        referenceRange: '99-110',
        unit: 'mmol/L',
        price: 5,
        turnaroundTime: 30,
        isAvailable: true,
        category: '电解质',
      },
      {
        itemCode: 'ELE004',
        itemName: '钙',
        itemShortName: 'Ca',
        loincCode: '17861-6',
        specimenType: '血清',
        department: '检验科',
        referenceRange: '2.11-2.52',
        unit: 'mmol/L',
        price: 5,
        turnaroundTime: 30,
        isAvailable: true,
        category: '电解质',
      },
      // 肿瘤标志物
      {
        itemCode: 'TUM001',
        itemName: '甲胎蛋白',
        itemShortName: 'AFP',
        loincCode: '1834-1',
        specimenType: '血清',
        department: '检验科',
        referenceRange: '0-7',
        unit: 'ng/mL',
        price: 60,
        turnaroundTime: 120,
        isAvailable: true,
        category: '肿瘤标志物',
      },
      {
        itemCode: 'TUM002',
        itemName: '癌胚抗原',
        itemShortName: 'CEA',
        loincCode: '2039-8',
        specimenType: '血清',
        department: '检验科',
        referenceRange: '0-5',
        unit: 'ng/mL',
        price: 60,
        turnaroundTime: 120,
        isAvailable: true,
        category: '肿瘤标志物',
      },
      {
        itemCode: 'TUM003',
        itemName: '糖类抗原125',
        itemShortName: 'CA125',
        loincCode: '29413-4',
        specimenType: '血清',
        department: '检验科',
        referenceRange: '0-35',
        unit: 'U/mL',
        price: 80,
        turnaroundTime: 120,
        isAvailable: true,
        category: '肿瘤标志物',
      },
    ];
    items.forEach((item) => this.catalog.set(item.itemCode, item));
  }

  private seedReports(): void {
    // 血常规报告（正常）
    this.reports.set('RPT000001', {
      reportId: 'RPT000001',
      patientId: 'P20240001',
      encounterId: 'E202400011',
      orderId: 'ORD001',
      lisOrderId: 'LIS001',
      reportType: '血常规',
      reportStatus: 'final',
      reportedAt: '2024-06-15T10:30:00Z',
      reportedBy: '张检验师',
      reviewedBy: '李主任',
      instrument: 'Sysmex XN-9000',
      results: [
        {
          itemCode: 'CBC001',
          itemName: '白细胞计数',
          resultValue: '6.5',
          numericValue: 6.5,
          unit: '×10^9/L',
          referenceRange: '3.5-9.5',
          referenceLow: 3.5,
          referenceHigh: 9.5,
          abnormalFlag: 'normal',
          specimenType: '全血',
          testedAt: '2024-06-15T10:15:00Z',
        },
        {
          itemCode: 'CBC002',
          itemName: '红细胞计数',
          resultValue: '4.8',
          numericValue: 4.8,
          unit: '×10^12/L',
          referenceRange: '4.3-5.8',
          referenceLow: 4.3,
          referenceHigh: 5.8,
          abnormalFlag: 'normal',
          specimenType: '全血',
          testedAt: '2024-06-15T10:15:00Z',
        },
        {
          itemCode: 'CBC003',
          itemName: '血红蛋白',
          resultValue: '148',
          numericValue: 148,
          unit: 'g/L',
          referenceRange: '130-175',
          referenceLow: 130,
          referenceHigh: 175,
          abnormalFlag: 'normal',
          specimenType: '全血',
          testedAt: '2024-06-15T10:15:00Z',
        },
        {
          itemCode: 'CBC004',
          itemName: '血小板计数',
          resultValue: '220',
          numericValue: 220,
          unit: '×10^9/L',
          referenceRange: '125-350',
          referenceLow: 125,
          referenceHigh: 350,
          abnormalFlag: 'normal',
          specimenType: '全血',
          testedAt: '2024-06-15T10:15:00Z',
        },
        {
          itemCode: 'CBC005',
          itemName: '中性粒细胞百分比',
          resultValue: '62.5',
          numericValue: 62.5,
          unit: '%',
          referenceRange: '40-75',
          referenceLow: 40,
          referenceHigh: 75,
          abnormalFlag: 'normal',
          specimenType: '全血',
          testedAt: '2024-06-15T10:15:00Z',
        },
      ],
    });

    // 生化报告（含异常值）
    this.reports.set('RPT000002', {
      reportId: 'RPT000002',
      patientId: 'P20240001',
      encounterId: 'E202400011',
      orderId: 'ORD002',
      lisOrderId: 'LIS002',
      reportType: '生化全套',
      reportStatus: 'final',
      reportedAt: '2024-06-15T11:00:00Z',
      reportedBy: '王检验师',
      reviewedBy: '李主任',
      instrument: 'Roche Cobas 8000',
      results: [
        {
          itemCode: 'BIO001',
          itemName: '谷丙转氨酶',
          resultValue: '45',
          numericValue: 45,
          unit: 'U/L',
          referenceRange: '9-50',
          referenceLow: 9,
          referenceHigh: 50,
          abnormalFlag: 'normal',
          specimenType: '血清',
          testedAt: '2024-06-15T10:45:00Z',
        },
        {
          itemCode: 'BIO002',
          itemName: '谷草转氨酶',
          resultValue: '38',
          numericValue: 38,
          unit: 'U/L',
          referenceRange: '15-40',
          referenceLow: 15,
          referenceHigh: 40,
          abnormalFlag: 'normal',
          specimenType: '血清',
          testedAt: '2024-06-15T10:45:00Z',
        },
        {
          itemCode: 'BIO003',
          itemName: '肌酐',
          resultValue: '105',
          numericValue: 105,
          unit: 'μmol/L',
          referenceRange: '57-97',
          referenceLow: 57,
          referenceHigh: 97,
          abnormalFlag: 'high',
          specimenType: '血清',
          testedAt: '2024-06-15T10:45:00Z',
          remarks: '轻度升高',
        },
        {
          itemCode: 'BIO004',
          itemName: '尿素氮',
          resultValue: '7.2',
          numericValue: 7.2,
          unit: 'mmol/L',
          referenceRange: '3.1-8.0',
          referenceLow: 3.1,
          referenceHigh: 8.0,
          abnormalFlag: 'normal',
          specimenType: '血清',
          testedAt: '2024-06-15T10:45:00Z',
        },
        {
          itemCode: 'BIO005',
          itemName: '空腹血糖',
          resultValue: '7.8',
          numericValue: 7.8,
          unit: 'mmol/L',
          referenceRange: '3.9-6.1',
          referenceLow: 3.9,
          referenceHigh: 6.1,
          abnormalFlag: 'high',
          specimenType: '血浆',
          testedAt: '2024-06-15T10:45:00Z',
          remarks: '升高，建议复查',
        },
        {
          itemCode: 'BIO006',
          itemName: '总胆固醇',
          resultValue: '5.8',
          numericValue: 5.8,
          unit: 'mmol/L',
          referenceRange: '<5.2',
          referenceHigh: 5.2,
          abnormalFlag: 'high',
          specimenType: '血清',
          testedAt: '2024-06-15T10:45:00Z',
        },
        {
          itemCode: 'BIO007',
          itemName: '甘油三酯',
          resultValue: '2.1',
          numericValue: 2.1,
          unit: 'mmol/L',
          referenceRange: '<1.7',
          referenceHigh: 1.7,
          abnormalFlag: 'high',
          specimenType: '血清',
          testedAt: '2024-06-15T10:45:00Z',
        },
      ],
    });

    // 心肌酶报告（含危急值）
    this.reports.set('RPT000003', {
      reportId: 'RPT000003',
      patientId: 'P20240003',
      encounterId: 'E202400031',
      orderId: 'ORD003',
      lisOrderId: 'LIS003',
      reportType: '心肌损伤标志物',
      reportStatus: 'final',
      reportedAt: '2024-07-10T14:30:00Z',
      reportedBy: '张检验师',
      reviewedBy: '李主任',
      instrument: 'Abbott Architect i2000',
      results: [
        {
          itemCode: 'CAR001',
          itemName: '肌钙蛋白I',
          resultValue: '5.8',
          numericValue: 5.8,
          unit: 'ng/mL',
          referenceRange: '0-0.04',
          referenceLow: 0,
          referenceHigh: 0.04,
          abnormalFlag: 'critical',
          specimenType: '血清',
          testedAt: '2024-07-10T14:15:00Z',
          remarks: '危急值！显著升高，提示急性心肌梗死',
        },
        {
          itemCode: 'CAR002',
          itemName: '肌酸激酶同工酶',
          resultValue: '85',
          numericValue: 85,
          unit: 'U/L',
          referenceRange: '0-25',
          referenceLow: 0,
          referenceHigh: 25,
          abnormalFlag: 'high',
          specimenType: '血清',
          testedAt: '2024-07-10T14:15:00Z',
        },
        {
          itemCode: 'CAR003',
          itemName: '肌红蛋白',
          resultValue: '280',
          numericValue: 280,
          unit: 'ng/mL',
          referenceRange: '0-70',
          referenceLow: 0,
          referenceHigh: 70,
          abnormalFlag: 'high',
          specimenType: '血清',
          testedAt: '2024-07-10T14:15:00Z',
        },
      ],
    });

    // 电解质报告（含危急低钾）
    this.reports.set('RPT000004', {
      reportId: 'RPT000004',
      patientId: 'P20240002',
      encounterId: 'E202400021',
      orderId: 'ORD004',
      lisOrderId: 'LIS004',
      reportType: '电解质',
      reportStatus: 'final',
      reportedAt: '2024-07-20T09:30:00Z',
      reportedBy: '王检验师',
      reviewedBy: '李主任',
      instrument: 'Roche Cobas 8000',
      results: [
        {
          itemCode: 'ELE001',
          itemName: '钾',
          resultValue: '2.8',
          numericValue: 2.8,
          unit: 'mmol/L',
          referenceRange: '3.5-5.3',
          referenceLow: 3.5,
          referenceHigh: 5.3,
          abnormalFlag: 'critical',
          specimenType: '血清',
          testedAt: '2024-07-20T09:15:00Z',
          remarks: '危急值！低钾血症',
        },
        {
          itemCode: 'ELE002',
          itemName: '钠',
          resultValue: '138',
          numericValue: 138,
          unit: 'mmol/L',
          referenceRange: '137-147',
          referenceLow: 137,
          referenceHigh: 147,
          abnormalFlag: 'normal',
          specimenType: '血清',
          testedAt: '2024-07-20T09:15:00Z',
        },
        {
          itemCode: 'ELE003',
          itemName: '氯',
          resultValue: '102',
          numericValue: 102,
          unit: 'mmol/L',
          referenceRange: '99-110',
          referenceLow: 99,
          referenceHigh: 110,
          abnormalFlag: 'normal',
          specimenType: '血清',
          testedAt: '2024-07-20T09:15:00Z',
        },
      ],
    });

    // 凝血报告
    this.reports.set('RPT000005', {
      reportId: 'RPT000005',
      patientId: 'P20240003',
      encounterId: 'E202400031',
      orderId: 'ORD005',
      lisOrderId: 'LIS005',
      reportType: '凝血功能',
      reportStatus: 'final',
      reportedAt: '2024-07-22T15:00:00Z',
      reportedBy: '张检验师',
      reviewedBy: '李主任',
      instrument: 'Sysmex CS-5100',
      results: [
        {
          itemCode: 'COA001',
          itemName: '凝血酶原时间',
          resultValue: '13.2',
          numericValue: 13.2,
          unit: '秒',
          referenceRange: '11-14',
          referenceLow: 11,
          referenceHigh: 14,
          abnormalFlag: 'normal',
          specimenType: '血浆',
          testedAt: '2024-07-22T14:45:00Z',
        },
        {
          itemCode: 'COA002',
          itemName: '活化部分凝血活酶时间',
          resultValue: '32.5',
          numericValue: 32.5,
          unit: '秒',
          referenceRange: '25-35',
          referenceLow: 25,
          referenceHigh: 35,
          abnormalFlag: 'normal',
          specimenType: '血浆',
          testedAt: '2024-07-22T14:45:00Z',
        },
      ],
    });
  }

  // === 检验申请 ===

  async orderLabTest(request: LabOrderRequest): Promise<LabOrderResult> {
    return this.execute(async () => {
      this.orderCounter++;
      const orderId = `LAB${Date.now()}${this.orderCounter}`;
      return {
        orderId,
        lisOrderId: `LIS${orderId}`,
        status: 'pending',
        orderedAt: new Date().toISOString(),
        message: `检验申请已提交，共${request.testItems.length}项`,
      };
    });
  }

  async cancelLabTest(orderId: string, reason: string): Promise<boolean> {
    return this.execute(async () => {
      this.logger.info(`取消检验申请 [${orderId}]，原因：${reason}`);
      return true;
    });
  }

  // === 检验结果查询 ===

  async getLabResult(reportId: string): Promise<LabReport> {
    return this.execute(async () => {
      const report = this.reports.get(reportId);
      if (!report) {
        throw AdapterError.business(
          `检验报告 [${reportId}] 不存在`,
          AdapterErrorCode.UNKNOWN_ERROR,
          { adapterId: this.id },
        );
      }
      return report;
    });
  }

  async getLabResultList(
    patientId: string,
    encounterId?: string,
    limit = 20,
  ): Promise<LabReport[]> {
    return this.execute(async () => {
      let list = Array.from(this.reports.values()).filter((r) => r.patientId === patientId);
      if (encounterId) list = list.filter((r) => r.encounterId === encounterId);
      return list.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt)).slice(0, limit);
    });
  }

  // === 危急值订阅 ===

  subscribeCriticalValues(callback: (event: CriticalValueEvent) => void): Unsubscribe {
    this.subscriptionCounter++;
    const subscriptionId = `SUB${String(this.subscriptionCounter).padStart(6, '0')}`;
    this.criticalValueListeners.set(subscriptionId, callback);
    return () => {
      this.criticalValueListeners.delete(subscriptionId);
    };
  }

  unsubscribeCriticalValues(subscriptionId: string): void {
    this.criticalValueListeners.delete(subscriptionId);
  }

  /** 触发危急值事件（测试用） */
  emitCriticalValue(event: CriticalValueEvent): void {
    this.criticalValueListeners.forEach((cb) => {
      try {
        cb(event);
      } catch {
        /* ignore */
      }
    });
  }

  // === 检验项目目录 ===

  async getTestCatalog(category?: string, keyword?: string): Promise<LabTestCatalogItem[]> {
    return this.execute(async () => {
      let list = Array.from(this.catalog.values());
      if (category) list = list.filter((i) => i.category === category);
      if (keyword)
        list = list.filter(
          (i) =>
            i.itemName.includes(keyword) ||
            i.itemCode.includes(keyword) ||
            (i.itemShortName ?? '').toLowerCase().includes(keyword.toLowerCase()),
        );
      return list;
    });
  }

  // === HL7 ORM/ORU ===

  async buildOrderHL7Message(request: LabOrderRequest): Promise<string> {
    return this.execute(async () => {
      const now = new Date()
        .toISOString()
        .replace(/[-:T.Z]/g, '')
        .slice(0, 12);
      const items = request.testItems.map((t) => `${t.itemCode}^${t.itemName}`).join('~');
      const msh = `MSH|^~\\&|JIANLAN|HOSPITAL|LIS|LIS|${now}||ORM^O01|ORD${Date.now()}|P|2.5.1`;
      const pid = `PID|||${request.patientId}|||`;
      const obr = `OBR|1|${request.encounterId ?? ''}|LIS${Date.now()}|${items}||${now}|||||||${request.orderedBy}|||${request.urgency === 'stat' ? 'S' : 'R'}`;
      return [msh, pid, obr].join('\r');
    });
  }

  async parseResultHL7Message(message: string): Promise<LabReport> {
    return this.execute(async () => {
      const segments = message.split(/\r|\n/).filter((s) => s.trim().length > 0);
      let patientId = '';
      let encounterId = '';
      let reportId = `RPT${Date.now()}`;
      const results: LabResultItem[] = [];

      for (const seg of segments) {
        const fields = seg.split('|');
        const segType = fields[0];
        if (segType === 'PID') {
          patientId = fields[3] ?? '';
        } else if (segType === 'OBR') {
          reportId = fields[2] ?? reportId;
          encounterId = fields[1] ?? '';
        } else if (segType === 'OBX') {
          // OBX|1|NM|code^name| |value|unit|ref|abn|...
          const ident = (fields[3] ?? '^').split('^');
          const valueStr = fields[5] ?? '';
          const unit = fields[6] ?? '';
          const refRange = fields[7] ?? '';
          const abn = fields[8] ?? 'N';
          results.push({
            itemCode: ident[0] ?? '',
            itemName: ident[1] ?? '',
            resultValue: valueStr,
            numericValue: Number(valueStr) || undefined,
            unit,
            referenceRange: refRange,
            abnormalFlag:
              abn === 'HH' || abn === 'LL' || abn === 'C'
                ? 'critical'
                : abn === 'H' || abn === 'A'
                  ? 'high'
                  : abn === 'L'
                    ? 'low'
                    : 'normal',
            testedAt: new Date().toISOString(),
          });
        }
      }

      return {
        reportId,
        patientId,
        encounterId,
        orderId: '',
        reportType: 'HL7 ORU',
        reportStatus: 'final',
        reportedAt: new Date().toISOString(),
        reportedBy: 'LIS',
        reviewedBy: '',
        results,
        rawData: message,
      };
    });
  }
}
