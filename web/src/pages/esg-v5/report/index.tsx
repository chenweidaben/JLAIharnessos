/**
 * 健澜科技 jlmedaios - ESG 与可持续发展 V5 页（M261-D）
 *
 * 碳核算能耗水耗废弃物绿色采购碳目标/患者安全员工权益社区健康公益慈善健康教育/公司治理合规伦理反腐败信息披露利益相关方/基线减排目标中和路径碳交易绿色金融/绿色建筑节能改造无纸化绿色食堂碳中和活动/医疗服务量公益性对口支援健康科普志愿服务/报告指标第三方鉴证评级改进/碳强度员工满意度公益时长合规事件评级。深海蓝 VI。
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
  environment: { carbonAccounting: number; energy: number; water: number; waste: number; greenProcurement: number; target: number };
  social: { patientSafety: number; employeeRights: number; communityHealth: number; charity: number; healthEducation: number };
  governance: { governance: number; compliance: number; ethics: number; antiCorruption: number; disclosure: number; stakeholder: number };
  carbonPath: { baseline: number; reduction: number; neutrality: number; path: number; carbonTrade: number; greenFinance: number };
  greenHospital: { greenBuilding: number; energyRetrofit: number; paperless: number; greenCanteen: number; carbonNeutralActivity: number };
  publicWelfare: { serviceVolume: number; publicWelfare: number; twinSupport: number; healthScience: number; volunteer: number };
  reporting: { report: number; indicators: number; thirdParty: number; rating: number; improvement: number };
  metrics: { carbonIntensity: number; employeeSatisfaction: number; volunteerHours: number; compliance: number; rating: number };
  suggestions: string[];
}

export default function ESGV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/esg-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>ESG 与可持续发展 V5</Title>
        <Paragraph type="secondary">碳核算·能耗·水耗·废弃物·绿色采购·碳目标 / 患者安全·员工权益·社区健康·公益慈善·健康教育 / 公司治理·合规·伦理·反腐败·信息披露·利益相关方 / 基线·减排目标·中和路径·碳交易·绿色金融 / 绿色建筑·节能改造·无纸化·绿色食堂·碳中和活动</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="碳强度" value={data.metrics.carbonIntensity} suffix="kgCO2/次" /></Card></Col>
              <Col span={6}><Card><Statistic title="员工满意度" value={`${data.metrics.employeeSatisfaction}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="公益时长" value={data.metrics.volunteerHours} /></Card></Col>
              <Col span={6}><Card><Statistic title="ESG 评级" value={data.metrics.rating} suffix="分" /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>ESG 明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "carbon", name: "碳核算覆盖", value: `${data.environment.carbonAccounting}%` },
                  { key: "patient", name: "患者安全", value: `${data.social.patientSafety}%` },
                  { key: "governance", name: "公司治理", value: `${data.governance.governance}%` },
                  { key: "paperless", name: "无纸化", value: `${data.greenHospital.paperless}%` },
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
