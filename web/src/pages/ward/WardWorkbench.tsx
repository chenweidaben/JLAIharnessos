/**
 * 健澜科技 jlmedaios - 住院工作台（M1-A ADT + M1-B2 在院诊疗，真实 BFF）
 *
 * 标签：
 *  - 床位总览 / 在院患者 / 入院登记：真实 BFF，ADT 事务落 PostgreSQL；
 *  - 在院诊疗（M1-B2）：医生查房、护士护理记录单、在院医嘱全部真实落库，
 *      含本人签名 / 上级审签 / 双人核对，无 mock。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Layout, Spin, Tabs, Typography } from 'antd';
import {
  HomeOutlined,
  MedicineBoxOutlined,
  UserAddOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useInpatientStore } from '@/store/inpatientStore';
import InpatientBedMap from '@/components/inpatient/InpatientBedMap';
import InpatientList from '@/components/inpatient/InpatientList';
import AdmissionForm from '@/components/inpatient/AdmissionForm';
import BedPatientDrawer from '@/components/inpatient/BedPatientDrawer';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { CareWorkbench } from '@/components/care';

const { Header, Content } = Layout;

export default function WardWorkbench() {
  const { ready, checkHealth, fetchBedMap, fetchPatients } = useInpatientStore();
  const [tab, setTab] = useState('bedmap');

  useEffect(() => {
    void checkHealth();
    void fetchBedMap();
    void fetchPatients();
  }, [checkHealth, fetchBedMap, fetchPatients]);

  return (
    <Layout className="min-h-screen bg-ink-bg">
      <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
        <div className="flex items-center gap-3">
          <MedicineBoxOutlined className="text-2xl text-white" />
          <Typography.Title level={4} className="!mb-0 !text-white">
            住院工作台 · ADT / 在院诊疗
          </Typography.Title>
          <span className="hidden text-sm text-white/70 md:inline">
            入院 / 换床 / 转科 / 出院 · 查房 / 护理 / 医嘱 · 医师复核签名
          </span>
        </div>
        <span className="text-xs text-white/60">健澜科技 jlmedaios</span>
      </Header>
      <Content className="p-4">
        <DemoModeBanner />
        <Spin spinning={ready === null}>
          <Tabs
            activeKey={tab}
            onChange={setTab}
            items={[
              {
                key: 'bedmap',
                label: (
                  <span>
                    <HomeOutlined /> 床位总览
                  </span>
                ),
                children: <InpatientBedMap />,
              },
              {
                key: 'patients',
                label: (
                  <span>
                    <TeamOutlined /> 在院患者
                  </span>
                ),
                children: <InpatientList />,
              },
              {
                key: 'admit',
                label: (
                  <span>
                    <UserAddOutlined /> 入院登记
                  </span>
                ),
                children: <AdmissionForm />,
              },
              {
                key: 'care',
                label: (
                  <span>
                    <MedicineBoxOutlined /> 在院诊疗
                  </span>
                ),
                children: <CareWorkbench />,
              },
            ]}
          />
        </Spin>
      </Content>

      {/* 床位患者摘要抽屉（全局单挂） */}
      <BedPatientDrawer />
    </Layout>
  );
}
