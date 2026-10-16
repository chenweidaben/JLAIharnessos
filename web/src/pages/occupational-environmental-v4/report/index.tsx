/**
 * 健澜科技 jlmedaios - 职业环境 V4 页（M249-D）
 *
 * 上岗在岗离岗应急禁忌健康档案/尘肺职业中毒物理因素肿瘤诊断报告/肌肉骨骼心理过劳压力职业倦怠/空气水土壤噪音辐射环境病/焦虑抑郁失眠EAP咨询危机干预/防护设施个人防护培训健康促进/队列病例对照暴露评估AI流调。深海蓝 VI。
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
  exam: { pre: number; on: number; exit: number };
  disease: { pneumoconiosis: number; poisoning: number; neoplasm: number };
  ergonomic: { msd: number; burnout: number; stress: number };
  environment: { air: number; water: number; noise: number; radiation: number };
  mental: { eap: number; counseling: number; crisis: number };
  suggestions: string[];
}

export default function OccupationalEnvironmentalV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/occupational-environmental-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>职业环境 V4</Title>
        <Paragraph type="secondary">上岗·在岗·离岗·应急·禁忌·健康档案 / 尘肺·职业中毒·物理因素·肿瘤·诊断报告 / 肌肉骨骼·心理·过劳·压力·职业倦怠 / 空气·水·土壤·噪音·辐射·环境病 / 焦虑·抑郁·失眠·EAP·咨询·危机干预 / 防护设施·个人防护·培训·健康促进 / 队列·病例对照·暴露评估·AI 流调</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="在岗体检" value={data.exam.on} /></Card></Col>
              <Col span={6}><Card><Statistic title="尘肺" value={data.disease.pneumoconiosis} /></Card></Col>
              <Col span={6}><Card><Statistic title="肌肉骨骼病" value={data.ergonomic.msd} /></Card></Col>
              <Col span={6}><Card><Statistic title="EAP" value={data.mental.eap} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>职业明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "poisoning", name: "职业中毒", value: data.disease.poisoning },
                  { key: "burnout", name: "职业倦怠", value: data.ergonomic.burnout },
                  { key: "noise", name: "噪音监测", value: data.environment.noise },
                  { key: "counseling", name: "心理咨询", value: data.mental.counseling },
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
