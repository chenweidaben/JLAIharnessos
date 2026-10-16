/**
 * 健澜科技 jlmedaios - 职业与环境健康 V3 页（M239-D）
 *
 * 上岗在岗离岗职业健康检查/尘肺职业中毒物理因素诊断/工作相关肌肉骨骼过劳EAP/环境空气水噪音辐射。深海蓝 VI。
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
  exam: { pre: number; in: number; post: number };
  disease: { pneumoconiosis: number; toxicosis: number };
  workRelated: { msd: number; burnout: number };
  environment: { air: number; water: number; noise: number; radiation: number };
  mental: { screened: number; eap: number };
  suggestions: string[];
}

export default function OccupationalEnvironmentalV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/occupational-environmental-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>职业与环境健康 V3</Title>
        <Paragraph type="secondary">上岗·在岗·离岗职业健康检查 / 尘肺·职业中毒·物理因素诊断 / 工作相关肌肉骨骼·过劳 EAP / 环境空气·水·噪音·辐射</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="在岗体检" value={data.exam.in} /></Card></Col>
              <Col span={6}><Card><Statistic title="尘肺诊断" value={data.disease.pneumoconiosis} /></Card></Col>
              <Col span={6}><Card><Statistic title="肌肉骨骼" value={data.workRelated.msd} /></Card></Col>
              <Col span={6}><Card><Statistic title="心理筛查" value={data.mental.screened} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>职业环境明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "toxicosis", name: "职业中毒", value: data.disease.toxicosis },
                  { key: "burnout", name: "过劳", value: data.workRelated.burnout },
                  { key: "air", name: "空气监测", value: data.environment.air },
                  { key: "eap", name: "EAP 服务", value: data.mental.eap },
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
