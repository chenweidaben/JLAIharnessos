/**
 * 健澜科技 jlmedaios - 家庭医生签约服务 V5 页（M262-C）
 *
 * 签约包团队居民重点人群签约率续签率/健康档案慢病管理年度体检健康教育随访/家庭病床上门巡诊上门护理康复指导安宁疗护/基础包增值包医保支付基本公共卫生个性化/全科专科护理公卫药师信息化支持/签约健康指标满意度费用基层首诊转诊/小程序健康数据签约医生咨询预约随访/慢病控制基层首诊费用满意度健康素养。深海蓝 VI。
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
  sign: { package: number; team: number; resident: number; priority: number; signRate: number; renewalRate: number };
  healthMgmt: { record: number; chronic: number; annualExam: number; education: number; followup: number };
  homeService: { homebed: number; homeVisit: number; nursing: number; rehab: number; hospice: number };
  package: { basic: number; value: number; insurance: number; publicHealth: number; personalized: number };
  team: { gp: number; specialty: number; nurse: number; publicHealth: number; pharmacist: number; it: number };
  kpi: { sign: number; healthIndicator: number; satisfaction: number; cost: number; firstVisit: number; referral: number };
  residentApp: { miniApp: number; healthData: number; doctorConsult: number; appointment: number; followup: number };
  outcome: { chronicControl: number; firstVisit: number; cost: number; satisfaction: number; literacy: number };
  suggestions: string[];
}

export default function FamilyDoctorV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/family-doctor-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>家庭医生签约服务 V5</Title>
        <Paragraph type="secondary">签约包·团队·居民·重点人群·签约率·续签率 / 健康档案·慢病管理·年度体检·健康教育·随访 / 家庭病床·上门巡诊·上门护理·康复指导·安宁疗护 / 基础包·增值包·医保支付·基本公共卫生·个性化 / 全科·专科·护理·公卫·药师·信息化支持</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="签约率" value={`${data.kpi.sign}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="续签率" value={`data.sign.renewalRate%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="基层首诊" value={`${data.kpi.firstVisit}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.kpi.satisfaction}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>签约明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "resident", name: "签约居民", value: data.sign.resident },
                  { key: "homeVisit", name: "上门服务", value: data.homeService.homeVisit },
                  { key: "chronic", name: "慢病管理", value: `${data.healthMgmt.chronic}%` },
                  { key: "gp", name: "全科医生", value: data.team.gp },
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
