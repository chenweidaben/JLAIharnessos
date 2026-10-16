/**
 * 健澜科技 jlmedaios - 国际医疗 V3 页（M246-D）
 *
 * 外宾门诊病房国际保险多语言/JCI-HIMSS-ISO认证评审/跨境会诊转诊/一带一路援外/国际保险直付。深海蓝 VI。
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
  services: { vipClinic: number; vipWard: number; multilingual: number };
  accreditation: { jci: number; himss: number; iso: number };
  collaboration: { crossBorder: number; bri: number; aid: number };
  insurance: { directPay: number; partners: number };
  suggestions: string[];
}

export default function InternationalHealthV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/international-health-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>国际医疗 V3</Title>
        <Paragraph type="secondary">外宾门诊·病房·国际保险·多语言 / JCI·HIMSS·ISO 认证评审 / 跨境会诊·转诊 / 一带一路·援外 / 国际保险直付</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="外宾病房" value={data.services.vipWard} /></Card></Col>
              <Col span={6}><Card><Statistic title="JCI 评分" value={data.accreditation.jci} /></Card></Col>
              <Col span={6}><Card><Statistic title="跨境会诊" value={data.collaboration.crossBorder} /></Card></Col>
              <Col span={6}><Card><Statistic title="直付保险" value={data.insurance.directPay} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>国际明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "multilingual", name: "多语言", value: data.services.multilingual },
                  { key: "himss", name: "HIMSS", value: data.accreditation.himss },
                  { key: "bri", name: "一带一路", value: data.collaboration.bri },
                  { key: "partners", name: "保险合作方", value: data.insurance.partners },
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
