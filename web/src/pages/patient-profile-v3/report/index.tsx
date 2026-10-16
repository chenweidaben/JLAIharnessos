/**
 * 健澜科技 jlmedaios - 患者画像 V3 页（M255-C）
 *
 * 360画像基本就诊历史诊断用药检查检验费用满意度/高血压糖尿病冠心病脑卒中肿瘤慢阻肺肾病肝病标签/再入院非计划手术严重并发症死亡高费用风险识别/红黄绿高风险中风险低风险分层管理随访策略/预约就诊检查治疗离院随访全旅程断点分析/就诊沟通支付偏好健康素养生活方式/收入教育职业居住交通家庭支持社会隔离/精准宣教个性化随访资源调配风险管理服务推荐。深海蓝 VI。
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
  profile360: { patients: number; basic: number; visitHistory: number; satisfaction: number };
  chronic: { htn: number; dm: number; chd: number; stroke: number; tumor: number; copd: number; ckd: number; liver: number };
  highRisk: { readmission: number; unplannedSurgery: number; complication: number; death: number; highCost: number };
  stratification: { red: number; yellow: number; green: number; followupStrategy: number };
  journey: { booking: number; visit: number; exam: number; treatment: number; discharge: number; breakpoint: number };
  preference: { communication: number; payment: number; literacy: number; lifestyle: number };
  social: { income: number; education: number; occupation: number; housing: number; transport: number; familySupport: number; isolation: number };
  application: { precisionEducation: number; personalizedFollowup: number; resourceAllocation: number; riskService: number };
  suggestions: string[];
}

export default function PatientProfileV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/patient-profile-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>患者画像 V3</Title>
        <Paragraph type="secondary">360 画像·基本·就诊历史·诊断·用药·费用·满意度 / 高血压·糖尿病·冠心病·脑卒中·肿瘤·慢阻肺 / 再入院·非计划手术·并发症·死亡·高费用风险 / 红黄绿·高风险·中风险·低风险·分层管理 / 预约·就诊·检查·治疗·离院·随访·全旅程 / 沟通·支付偏好·健康素养·生活方式 / 收入·教育·职业·居住·交通·家庭支持·社会隔离 / 精准宣教·个性化随访·资源调配·风险管理</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="画像患者数" value={data.profile360.patients} /></Card></Col>
              <Col span={6}><Card><Statistic title="高血压" value={data.chronic.htn} /></Card></Col>
              <Col span={6}><Card><Statistic title="高风险" value={data.stratification.red} /></Card></Col>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.profile360.satisfaction}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>画像明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "readmission", name: "再入院风险", value: data.highRisk.readmission },
                  { key: "yellow", name: "中风险", value: data.stratification.yellow },
                  { key: "breakpoint", name: "旅程断点", value: `${data.journey.breakpoint}%` },
                  { key: "isolation", name: "社会隔离", value: `${data.social.isolation}%` },
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
