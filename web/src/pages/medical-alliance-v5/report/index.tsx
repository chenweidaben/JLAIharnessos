/**
 * 健澜科技 jlmedaios - 医联体分级诊疗智能化 V5 页（M262-B）
 *
 * 城市医疗集团县域医共体专科联盟远程协作网/上转下转标准绿色通道床位预留转诊随访/专家坐诊手术带教查房培训远程会诊/基层医生工作站远程带教处方延伸检查互认/影像检验病理心电消毒供应后勤共享中心/基层就诊率下转率上转率县域内就诊率/智能分诊下转指征上转指征转诊决策/成员单位质量效率患者资源财政补助。深海蓝 VI。
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
  organization: { cityGroup: number; countyConsortium: number; specialtyNetwork: number; telemedicine: number };
  referral: { up: number; down: number; standard: number; greenChannel: number; bedReserve: number; followup: number };
  expert: { clinic: number; surgery: number; teaching: number; rounds: number; training: number; remoteConsult: number };
  grassroots: { workstation: number; teleTeaching: number; rxExtension: number; examRecognition: number };
  shared: { imaging: number; lab: number; pathology: number; ecg: number; sterilization: number; logistics: number };
  kpi: { grassVisitRate: number; downRate: number; upRate: number; countyRate: number };
  ai: { triage: number; downIndication: number; upIndication: number; decision: number };
  metrics: { member: number; quality: number; efficiency: number; patient: number; resource: number; subsidy: number };
  suggestions: string[];
}

export default function MedicalAllianceV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/medical-alliance-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>医联体分级诊疗智能化 V5</Title>
        <Paragraph type="secondary">城市医疗集团·县域医共体·专科联盟·远程协作网 / 上转·下转·标准·绿色通道·床位预留·转诊随访 / 专家坐诊·手术带教·查房·培训·远程会诊 / 基层医生工作站·远程带教·处方延伸·检查互认 / 影像·检验·病理·心电·消毒供应·后勤共享中心</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="基层就诊率" value={`${data.kpi.grassVisitRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="下转率" value={`${data.kpi.downRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="上转率" value={`${data.kpi.upRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="县域内就诊率" value={`${data.kpi.countyRate}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>医联体明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "up", name: "上转", value: data.referral.up },
                  { key: "down", name: "下转", value: data.referral.down },
                  { key: "greenChannel", name: "绿色通道", value: `${data.referral.greenChannel}%` },
                  { key: "remoteConsult", name: "远程会诊", value: data.expert.remoteConsult },
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
