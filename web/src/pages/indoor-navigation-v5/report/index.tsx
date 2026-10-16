/**
 * 健澜科技 jlmedaios - 院内智能导航 V5 页（M270-A）
 *
 * 院内地图（3D建模/楼层/科室/电梯/卫生间/食堂/停车/无障碍）/实时导航（蓝牙/UWB/AR步行导航/室内定位/目的地推荐）/停车管理（车位/引导/缴费/寻车/预约/无障碍车位/新能源）/就诊导航（从入口到诊室/检查/取药/缴费/出口多步路径）/导览服务（语音导览/设施查询/科室介绍/医生介绍/预约引导）/特殊人群（无障碍导航/老年模式/轮椅路径/视力障碍语音）/导航数据（位置准确度/使用率/找路时间/问询量下降/满意度）/运营优化（拥堵点/路径偏好/瓶颈/科室布局优化/导流动线）。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import {
  Card,
  Col,
  Layout,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Typography,
} from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  timeRange: string;
  campusMap: { modeling: number; floor: number; dept: number; elevator: number; restroom: number; canteen: number; parking: number; accessibility: number };
  realtimeNav: { ble: number; uwb: number; ar: number; walking: number; indoorLocation: number; destinationRec: number };
  parking: { spaces: number; guidance: number; payment: number; carFinding: number; reservation: number; accessibleEV: number; ev: number };
  visitNav: { entranceToConsult: number; exam: number; pharmacy: number; payment: number; exit: number; multistep: number };
  guide: { voice: number; facilityQuery: number; deptIntro: number; doctorIntro: number; appointmentGuide: number };
  special: { accessible: number; elderlyMode: number; wheelchair: number; visualImpairment: number };
  metrics: { accuracy: number; usageRate: number; findingTime: number; inquiryReduction: number; satisfaction: number };
  ops: { congestionPoint: number; pathPreference: number; bottleneck: number; layoutOptimization: number; flowGuidance: number };
  suggestions: string[];
}

export default function IndoorNavigationV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/indoor-navigation-v5/report");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>院内智能导航 V5</Title>
        <Paragraph type="secondary">院内地图·3D建模·楼层·科室·电梯·卫生间·食堂·停车·无障碍 / 实时导航·蓝牙·UWB·AR步行导航·室内定位·目的地推荐 / 停车管理·车位·引导·缴费·寻车·预约·无障碍车位·新能源</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="定位准确度" value={`${data.metrics.accuracy}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="使用率" value={`${data.metrics.usageRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="找路时间" value={`${data.metrics.findingTime}min`} /></Card></Col>
              <Col span={6}><Card><Statistic title="问询量下降" value={`${data.metrics.inquiryReduction}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>导航明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "map", name: "3D地图", value: `${data.campusMap.modeling}%` },
                  { key: "ble", name: "蓝牙定位", value: `${data.realtimeNav.ble}%` },
                  { key: "parking", name: "车位", value: data.parking.spaces },
                  { key: "visit", name: "多步路径", value: `${data.visitNav.multistep}%` },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "数值", dataIndex: "value", key: "value" },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
