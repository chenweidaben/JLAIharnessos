/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 医疗质量指标：转归 / 重返 / 单病种 / 核心制度 / 合理用药 / 合理检查 / 趋势 / 预警
 */
import { useEffect, useState } from 'react';
import { Alert, Col, Progress, Row, Statistic, Tabs, Tag } from 'antd';
import { AlertOutlined, CheckCircleOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { LineChart, PieChart } from '@/components/charts';
import { useOperationStore } from '@/store/operationStore';
import type { SingleDiseaseQuality } from '@/types/operation';
import { clickableProps } from '@/utils/a11y';

function RateBar({
  label,
  value,
  target,
  unit = '%',
  invert = false,
}: {
  label: string;
  value: number;
  target?: number;
  unit?: string;
  invert?: boolean;
}) {
  const reach = target != null ? (invert ? value <= target : value >= target) : true;
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-ink-secondary">{label}</span>
        <span>
          <b className={reach ? 'text-medical-normal' : 'text-medical-critical'}>{value}</b>
          <span className="text-ink-secondary">{unit}</span>
          {target != null && (
            <span className="ml-1 text-xs text-ink-secondary">
              (目标{invert ? '≤' : '≥'}
              {target})
            </span>
          )}
        </span>
      </div>
      <Progress
        percent={Math.min(100, value)}
        size="small"
        showInfo={false}
        strokeColor={reach ? '#52C41A' : '#F5222D'}
      />
    </div>
  );
}

function DiseasePanel({ disease }: { disease: SingleDiseaseQuality }) {
  const [activeItem, setActiveItem] = useState(0);
  const item = disease.items[activeItem];
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={10}>
        {disease.items.map((it, idx) => (
          <div
            key={it.name}
            {...clickableProps(() => setActiveItem(idx))}
            className={`mb-2 cursor-pointer rounded-lg border p-3 ${idx === activeItem ? 'border-jl-primary bg-jl-primary/5' : 'border-ink-border'}`}
          >
            <div className="flex items-center justify-between text-sm">
              <span>{it.name}</span>
              <span>
                <b
                  className={
                    it.rate >= it.benchmark ? 'text-medical-normal' : 'text-medical-critical'
                  }
                >
                  {it.rate}%
                </b>
                <span className="ml-1 text-xs text-ink-secondary">基准{it.benchmark}%</span>
              </span>
            </div>
          </div>
        ))}
      </Col>
      <Col xs={24} md={14}>
        <div className="jl-card p-4">
          <h3 className="m-0 mb-2 text-base font-medium">{item.name} · 执行率趋势</h3>
          <LineChart
            xData={item.trend.map((t) => t.label)}
            series={[{ name: '执行率%', data: item.trend.map((t) => t.value) }]}
            height={280}
          />
        </div>
      </Col>
    </Row>
  );
}

export default function QualityIndicators() {
  const q = useOperationStore((s) => s.qualityIndicators);
  const fetchQuality = useOperationStore((s) => s.fetchQualityIndicators);

  useEffect(() => {
    void fetchQuality();
  }, [fetchQuality]);

  return (
    <PageContainer
      title="医疗质量指标"
      description="转归安全 / 单病种 / 核心制度 / 合理用药与检查，依据《医疗质量管理办法》"
    >
      {/* 转归与安全概览 */}
      <Row gutter={[16, 16]}>
        {[
          { title: '治愈率', value: q.cureRate, suffix: '%', color: '#52C41A' },
          { title: '好转率', value: q.improveRate, suffix: '%', color: '#1890FF' },
          { title: '死亡率', value: q.deathRate, suffix: '%', color: '#F5222D' },
          { title: '31天再入院率', value: q.readmitRate, suffix: '%', color: '#FA8C16' },
          { title: '非计划再手术率', value: q.unplannedReopRate, suffix: '%', color: '#FA8C16' },
          {
            title: '手术并发症率',
            value: q.surgeryComplicationRate,
            suffix: '%',
            color: '#FA8C16',
          },
          { title: '医院感染率', value: q.infectionRate, suffix: '%', color: '#1890FF' },
          { title: '患者满意度', value: q.satisfaction, suffix: '%', color: '#52C41A' },
        ].map((c) => (
          <Col xs={12} md={8} lg={3} key={c.title}>
            <div className="jl-card p-4">
              <Statistic
                title={c.title}
                value={c.value}
                suffix={c.suffix}
                valueStyle={{ color: c.color, fontSize: 22 }}
              />
            </div>
          </Col>
        ))}
      </Row>

      {/* 预警指标 */}
      {q.warnings.length > 0 && (
        <div className="mt-4">
          {q.warnings.map((w) => (
            <Alert
              key={w.name}
              className="mb-2"
              type="warning"
              showIcon
              icon={<AlertOutlined />}
              message={`质量预警：${w.name} 当前 ${w.value}，阈值要求 ${w.threshold}`}
            />
          ))}
        </div>
      )}

      {/* 趋势 + 转归饼图 */}
      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} lg={16}>
          <div className="jl-card p-4">
            <h3 className="m-0 mb-2 text-base font-medium">质量指标月度趋势</h3>
            <LineChart
              xData={q.monthlyTrend.map((t) => t.month)}
              series={[
                { name: '治愈率%', data: q.monthlyTrend.map((t) => t.cureRate) },
                { name: '满意度%', data: q.monthlyTrend.map((t) => t.satisfaction) },
              ]}
            />
          </div>
        </Col>
        <Col xs={24} lg={8}>
          <div className="jl-card p-4">
            <h3 className="m-0 mb-2 text-base font-medium">住院转归结构</h3>
            <PieChart
              data={[
                { name: '治愈', value: q.cureRate },
                { name: '好转', value: q.improveRate },
                { name: '未愈', value: q.unhealRate },
                { name: '死亡', value: q.deathRate },
              ]}
              height={280}
            />
          </div>
        </Col>
      </Row>

      {/* 单病种质量 */}
      <div className="jl-card mt-4 p-4">
        <h3 className="m-0 mb-3 text-base font-medium">单病种质量控制指标</h3>
        <Tabs
          defaultActiveKey={q.singleDiseases[0].code}
          items={q.singleDiseases.map((d) => ({
            key: d.code,
            label: d.disease,
            children: <DiseasePanel disease={d} />,
          }))}
        />
      </div>

      {/* 核心制度 + 合理用药 */}
      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} lg={12}>
          <div className="jl-card p-4">
            <h3 className="m-0 mb-3 text-base font-medium">十八项核心制度执行率</h3>
            {q.coreSystems.map((c) => (
              <RateBar key={c.name} label={c.name} value={c.rate} target={95} />
            ))}
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="jl-card p-4">
            <h3 className="m-0 mb-3 text-base font-medium">合理用药指标</h3>
            <RateBar label="药占比" value={q.rationalDrug.drugRatio} target={30} invert />
            <RateBar
              label="门诊抗菌药物使用率"
              value={q.rationalDrug.abxOutpatientRate}
              target={20}
              invert
            />
            <RateBar
              label="住院抗菌药物使用率"
              value={q.rationalDrug.abxInpatientRate}
              target={60}
              invert
            />
            <RateBar
              label="抗菌药物使用强度 DDDs"
              value={q.rationalDrug.abxDDS}
              target={40}
              invert
            />
            <RateBar label="基本药物使用率" value={q.rationalDrug.essentialDrugRate} target={60} />
            <RateBar
              label="国家集采药品使用率"
              value={q.rationalDrug.centralizedDrugRate}
              target={40}
            />
            <RateBar label="处方合格率" value={q.rationalDrug.prescriptionQualified} target={98} />
          </div>
        </Col>
      </Row>

      {/* 合理检查 + 排名 */}
      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} lg={12}>
          <div className="jl-card p-4">
            <h3 className="m-0 mb-3 text-base font-medium">合理检查指标</h3>
            <RateBar label="检查占比" value={q.examRatio} target={20} invert />
            <RateBar label="大型设备检查阳性率" value={q.largeDevicePositiveRate} target={70} />
            <RateBar label="重复检查率" value={q.repeatExamRate} target={2.5} invert />
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="jl-card p-4">
            <h3 className="m-0 mb-3 text-base font-medium">
              <CheckCircleOutlined className="mr-1 text-jl-primary" />
              医生质量排名（本月）
            </h3>
            {q.doctorQualityRank.map((d, i) => (
              <div
                key={d.name}
                className="mb-2 flex items-center justify-between text-sm last:mb-0"
              >
                <span className="flex items-center gap-2">
                  <Tag color={i < 3 ? 'gold' : 'default'}>{i + 1}</Tag>
                  {d.name}
                </span>
                <span>
                  <b className="text-jl-primary">{d.value}</b>
                  <span className="text-ink-secondary"> 分</span>
                </span>
              </div>
            ))}
          </div>
        </Col>
      </Row>
    </PageContainer>
  );
}
