/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 工作台：核心指标 + 趋势图 + 占比分析
 */
import { useEffect } from 'react';
import { Col, Row } from 'antd';
import { TeamOutlined, AlertOutlined, RobotOutlined, HeartOutlined } from '@ant-design/icons';

import { PageContainer, DataCard } from '@/components/common';
import { LineChart, BarChart, PieChart, GaugeChart } from '@/components/charts';
import { usePageTitle } from '@/hooks';
import { fetchPatients } from '@/services/api/patient';
import { usePatientStore } from '@/store/patientStore';

export default function Dashboard() {
  usePageTitle('工作台');
  const setPatientList = usePatientStore((s) => s.setPatientList);

  useEffect(() => {
    fetchPatients().then(setPatientList);
  }, [setPatientList]);

  return (
    <PageContainer title="工作台" description="今日运营概览与关键指标">
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <DataCard title="在院患者" value={86} suffix="人" icon={<TeamOutlined />} trend={3.2} />
        </Col>
        <Col xs={12} md={6}>
          <DataCard title="今日告警" value={7} suffix="条" icon={<AlertOutlined />} trend={-1.5} />
        </Col>
        <Col xs={12} md={6}>
          <DataCard
            title="Agent 调用"
            value={1240}
            suffix="次"
            icon={<RobotOutlined />}
            trend={12.6}
          />
        </Col>
        <Col xs={12} md={6}>
          <DataCard
            title="危急值处理率"
            value="96.4"
            suffix="%"
            icon={<HeartOutlined />}
            trend={1.1}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} lg={16}>
          <div className="jl-card p-4">
            <h3 className="m-0 mb-2 text-base font-medium">生命体征监测趋势</h3>
            <LineChart
              xData={['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00']}
              series={[
                { name: '心率', data: [72, 70, 78, 85, 88, 80, 74] },
                { name: '收缩压', data: [118, 120, 132, 140, 138, 128, 122] },
              ]}
            />
          </div>
        </Col>
        <Col xs={24} lg={8}>
          <div className="jl-card p-4">
            <h3 className="m-0 mb-2 text-base font-medium">科室负载</h3>
            <PieChart
              data={[
                { name: '呼吸内科', value: 28 },
                { name: '心血管内科', value: 22 },
                { name: '内分泌科', value: 18 },
                { name: '神经内科', value: 12 },
                { name: '其他', value: 8 },
              ]}
              height={280}
            />
          </div>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} lg={12}>
          <div className="jl-card p-4">
            <h3 className="m-0 mb-2 text-base font-medium">科室收治统计</h3>
            <BarChart
              xData={['周一', '周二', '周三', '周四', '周五']}
              series={[
                { name: '入院', data: [12, 18, 15, 22, 19] },
                { name: '出院', data: [8, 14, 11, 16, 13] },
              ]}
            />
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="jl-card p-4">
            <h3 className="m-0 mb-2 text-base font-medium">危急值响应时效</h3>
            <GaugeChart name="平均响应(分钟)" value={8} max={30} />
          </div>
        </Col>
      </Row>
    </PageContainer>
  );
}
