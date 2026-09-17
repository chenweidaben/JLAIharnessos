/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 门诊统计：今日工作量、医生月度绩效、处方/检查申请概览。
 */
import React from 'react';
import { Card, Col, Progress, Row, Statistic } from 'antd';
import {
  UserOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  ExperimentOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useOutpatientStore } from '@/store/outpatientStore';

export const OutpatientStats: React.FC = () => {
  const stats = useOutpatientStore((s) => s.stats);
  const doctor = useOutpatientStore((s) => s.doctor);
  const quotaPct = Math.round((doctor.calledQuota / doctor.todayQuota) * 100);

  return (
    <Card size="small" title={<span className="text-sm font-semibold">门诊工作台统计</span>}>
      <Row gutter={[12, 12]}>
        <Col span={8}>
          <Statistic
            title="今日已诊"
            value={stats.todayVisited}
            prefix={<UserOutlined />}
            valueStyle={{ color: '#0A4D8C' }}
          />
        </Col>
        <Col span={8}>
          <Statistic title="待诊" value={stats.todayWaiting} />
        </Col>
        <Col span={8}>
          <Statistic title="过号" value={stats.todayPassed} valueStyle={{ color: '#FA8C16' }} />
        </Col>
        <Col span={8}>
          <Statistic
            title="平均就诊时长"
            value={`${stats.avgVisitMinutes} 分`}
            prefix={<ClockCircleOutlined />}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="处方数"
            value={stats.prescriptionCount}
            prefix={<MedicineBoxOutlined />}
          />
        </Col>
        <Col span={8}>
          <Statistic title="检查检验" value={stats.orderCount} prefix={<ExperimentOutlined />} />
        </Col>
      </Row>

      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1">
          <span>
            今日号源进度（{doctor.calledQuota}/{doctor.todayQuota}）
          </span>
          <span>{quotaPct}%</span>
        </div>
        <Progress percent={quotaPct} strokeColor="#0A4D8C" size="small" />
      </div>

      <div className="mt-3 pt-3 border-t border-ink-border">
        <div className="text-xs text-ink-secondary mb-2">本月工作量</div>
        <Row gutter={[12, 8]}>
          <Col span={12}>
            <Statistic title="门诊人次" value={stats.monthVisits} valueStyle={{ fontSize: 16 }} />
          </Col>
          <Col span={12}>
            <Statistic
              title="病历数"
              value={stats.monthRecords}
              prefix={<FileTextOutlined />}
              valueStyle={{ fontSize: 16 }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="处方数"
              value={stats.monthPrescriptions}
              valueStyle={{ fontSize: 16 }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="平均处方金额"
              value={stats.avgPrescriptionFee}
              precision={2}
              prefix="¥"
              valueStyle={{ fontSize: 16 }}
            />
          </Col>
        </Row>
      </div>
    </Card>
  );
};

export default OutpatientStats;
