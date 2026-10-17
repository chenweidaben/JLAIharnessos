/**
 * 健澜科技 jlmedaios - 门诊与手术量预测 V3 页（M277-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  department: string;
  avgForecast: number;
  peakForecast: number;
  staffing: { doctors: number; nurses: number; shift: string };
}

export default function VolumeForecastPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/volume-forecast?department=内科&horizon=7");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>门诊与手术量预测 V3</Title>
        <Paragraph type="secondary">趋势·周季节假日因子·异常检测·排班建议</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="科室" value={data.department} /></Card></Col>
            <Col span={6}><Card><Statistic title="日均预测" value={data.avgForecast} /></Card></Col>
            <Col span={6}><Card><Statistic title="峰值预测" value={data.peakForecast} /></Card></Col>
            <Col span={6}><Card><Statistic title={`排班(${data.staffing.shift})`} value={`${data.staffing.doctors}医/${data.staffing.nurses}护`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
