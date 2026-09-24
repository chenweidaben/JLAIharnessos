/**
 * 健澜科技 jlmedaios - 门诊统计面板（真实接口）
 *
 * 今日工作量、号源进度、本月工作量与处方概览。挂载时主动拉取 BFF 统计；
 * 数据未就绪时以 0 占位，不使用任何写死统计。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import React, { useEffect } from 'react';
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
  const fetchStats = useOutpatientStore((s) => s.fetchStats);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const todayQuota = doctor?.todayQuota ?? 0;
  const calledQuota = doctor?.calledQuota ?? 0;
  const quotaPct = todayQuota > 0 ? Math.round((calledQuota / todayQuota) * 100) : 0;

  return (
    <Card size="small" title={<span className="text-sm font-semibold">门诊工作台统计</span>}>
      <Row gutter={[12, 12]}>
        <Col span={8}>
          <Statistic
            title="今日已诊"
            value={stats?.todayVisited ?? 0}
            prefix={<UserOutlined />}
            valueStyle={{ color: '#0A4D8C' }}
          />
        </Col>
        <Col span={8}>
          <Statistic title="待诊" value={stats?.todayWaiting ?? 0} />
        </Col>
        <Col span={8}>
          <Statistic
            title="过号"
            value={stats?.todayPassed ?? 0}
            valueStyle={{ color: '#FA8C16' }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="平均就诊时长"
            value={`${stats?.avgVisitMinutes ?? 0} 分`}
            prefix={<ClockCircleOutlined />}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="处方数"
            value={stats?.prescriptionCount ?? 0}
            prefix={<MedicineBoxOutlined />}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="检查检验"
            value={stats?.orderCount ?? 0}
            prefix={<ExperimentOutlined />}
          />
        </Col>
      </Row>

      {todayQuota > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span>今日号源进度（{calledQuota}/{todayQuota}）</span>
            <span>{quotaPct}%</span>
          </div>
          <Progress percent={quotaPct} strokeColor="#0A4D8C" size="small" />
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-ink-border">
        <div className="text-xs text-ink-secondary mb-2">本月工作量</div>
        <Row gutter={[12, 8]}>
          <Col span={12}>
            <Statistic
              title="门诊人次"
              value={stats?.monthVisits ?? 0}
              valueStyle={{ fontSize: 16 }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="病历数"
              value={stats?.monthRecords ?? 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ fontSize: 16 }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="处方数"
              value={stats?.monthPrescriptions ?? 0}
              valueStyle={{ fontSize: 16 }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="平均处方金额"
              value={stats?.avgPrescriptionFee ?? 0}
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
