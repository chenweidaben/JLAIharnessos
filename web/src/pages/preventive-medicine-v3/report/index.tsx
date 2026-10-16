/**
 * 健澜科技 jlmedaios - 预防医学与公共卫生 V3 页（M239-A）
 *
 * 免疫规划二类疫苗冷链追溯/甲乙丙类传染病症状实验室监测预警/高血压糖尿病脑卒中肿瘤慢病危险因素干预。深海蓝 VI。
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
  immunization: { coverage: number; coldChain: number };
  surveillance: { notifiable: number; alerts: number };
  chronic: { hypertension: number; diabetes: number; stroke: number; cancer: number };
  school: number;
  nutrition: number;
  suggestions: string[];
}

export default function PreventiveMedicineV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/preventive-medicine-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>预防医学与公共卫生 V3</Title>
        <Paragraph type="secondary">免疫规划·二类疫苗冷链追溯 / 甲乙丙类传染病·症状实验室监测预警 / 高血压·糖尿病·脑卒中·肿瘤慢病危险因素干预</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="疫苗覆盖率 (%)" value={data.immunization.coverage} /></Card></Col>
              <Col span={6}><Card><Statistic title="法定传染病" value={data.surveillance.notifiable} /></Card></Col>
              <Col span={6}><Card><Statistic title="高血压管理" value={data.chronic.hypertension} /></Card></Col>
              <Col span={6}><Card><Statistic title="糖尿病管理" value={data.chronic.diabetes} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>公卫明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "cold", name: "冷链追溯 (%)", value: data.immunization.coldChain },
                  { key: "alert", name: "监测预警", value: data.surveillance.alerts },
                  { key: "stroke", name: "脑卒中", value: data.chronic.stroke },
                  { key: "cancer", name: "肿瘤", value: data.chronic.cancer },
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
