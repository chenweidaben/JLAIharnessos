/**
 * 健澜科技 jlmedaios - 在院诊疗工作台宿主（M1-B2，真实 BFF）
 *
 * 组合三大在院日常视图：医生查房 / 护士护理 / 在院医嘱。
 *
 * 严谨性：
 *  - 启动先探活 /system/health，BFF/数据库不可用时显式报错、区域置灰加水印，
 *    并阻断指针交互，绝不静默造假；
 *  - 患者下拉来自 ADT 真实在院列表，选中后各视图按 visitId 真实读写落库；
 *  - 临床写操作必须本人签名，AI 仅辅助，签名/审签/退回分支由各站组件承接。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Select, Spin, Tabs, Watermark } from 'antd';
import {
  AuditOutlined,
  FileProtectOutlined,
  ProfileOutlined,
} from '@ant-design/icons';

import { useCareStore } from '@/store/careStore';
import { useInpatientStore } from '@/store/inpatientStore';
import NursingStation from './NursingStation';
import OrderBoard from './OrderBoard';
import RoundStation from './RoundStation';

type TabKey = 'rounds' | 'nursing' | 'orders';

export default function CareWorkbench() {
  const [tab, setTab] = useState<TabKey>('rounds');
  const {
    ready,
    health,
    error,
    selectedVisitId,
    checkHealth,
    selectVisit,
  } = useCareStore();
  const { patients, fetchPatients } = useInpatientStore();

  useEffect(() => {
    void checkHealth();
    void fetchPatients();
  }, [checkHealth, fetchPatients]);

  const offline = ready === false;
  const demoMode = health?.demoMode === true;

  const options = useMemo(
    () =>
      patients.map((p) => ({
        value: p.visitId,
        label: `${p.nameMasked}（${p.bedNo ?? '未分床'}）· ${p.diagnosis}`,
      })),
    [patients],
  );

  const tabs = (
    <Tabs
      activeKey={tab}
      onChange={(k) => setTab(k as TabKey)}
      items={[
        {
          key: 'rounds',
          label: (
            <span>
              <AuditOutlined /> 医生查房
            </span>
          ),
          children: <RoundStation />,
        },
        {
          key: 'nursing',
          label: (
            <span>
              <FileProtectOutlined /> 护士护理
            </span>
          ),
          children: <NursingStation />,
        },
        {
          key: 'orders',
          label: (
            <span>
              <ProfileOutlined /> 在院医嘱
            </span>
          ),
          children: <OrderBoard />,
        },
      ]}
    />
  );

  return (
    <div className="space-y-3" data-testid="care-workbench">
      {offline && (
        <Alert
          type="error"
          showIcon
          message="无法连接在院诊疗后端或真实数据库"
          description={
            <div>
              <div>
                当前不能进行查房、护理、医嘱读写，界面已置灰并加离线水印。
                请检查 PostgreSQL（5433）与 BFF（8080）是否启动。
              </div>
              {error && <div className="mt-1 text-xs">错误详情：{error}</div>}
            </div>
          }
        />
      )}
      {!offline && demoMode && (
        <Alert
          type="info"
          showIcon
          message="BFF 当前为演示模式（DEMO_MODE=1），数据不持久化"
        />
      )}

      <Select
        showSearch
        allowClear
        style={{ width: '100%' }}
        placeholder="选择在院患者（来自 ADT 在院列表）"
        options={options}
        value={selectedVisitId}
        disabled={ready !== true}
        filterOption={(input, option) =>
          String(option?.label ?? '')
            .toLowerCase()
            .includes(input.toLowerCase())
        }
        onChange={(v) => void selectVisit(v)}
      />

      {ready === null ? (
        <div className="flex h-64 items-center justify-center">
          <Spin size="large" tip="正在探测在院诊疗后端与数据库…" />
        </div>
      ) : offline ? (
        <Watermark content={['离线', '数据库不可用']} gap={[120, 120]}>
          <div style={{ filter: 'grayscale(1)', opacity: 0.7, pointerEvents: 'none' }}>
            {tabs}
          </div>
        </Watermark>
      ) : (
        tabs
      )}
    </div>
  );
}
