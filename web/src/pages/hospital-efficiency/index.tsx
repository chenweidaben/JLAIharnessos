/**
 * 健澜科技 jlmedaios - 医院运营效率 V13 页（M322-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Resp {
  outpatientWaitMinutes: number;
  inpatientTurnoverDays: number;
  reportTimelinessRate: number;
}

export default function HospitalEfficiencyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/hospital-efficiency");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>医院运营效率</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="门诊次均等候时间" value={data.outpatientWaitMinutes} suffix="分钟" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="住院平均周转天数" value={data.inpatientTurnoverDays} suffix="天" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="检查报告及时率" value={data.reportTimelinessRate} suffix="%" />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
