/**
 * 健澜科技 jlmedaios - 区域医联体 V4 页（M253-C）
 *
 * 城市医疗集团县域医共体专科联盟远程协作网/转诊标准上转下转绿色通道指标系统/远程会诊影像病理心电超声门诊教学/专家坐诊手术带教人才培养技术输出管理输出/基层培训远程带教处方延伸检查互认信息系统/区域影像检验病理心电消毒供应中心/医疗质量运行监测公共卫生应急绩效考核/互联网医院健康档案慢病家庭医生签约分级诊疗。深海蓝 VI。
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
  organization: { cityGroup: number; countyConsortium: number; specialtyNetwork: number; teleCollab: number };
  referral: { up: number; down: number; greenChannel: number; standard: number };
  telemedicine: { consultation: number; image: number; pathology: number; cardiac: number };
  outreach: { expertClinic: number; surgery: number; mentor: number; talent: number };
  empowerment: { training: number; remoteMentor: number; prescriptionExtension: number; testRecognition: number };
  sharing: { imageCenter: number; labCenter: number; pathologyCenter: number; cssd: number };
  governance: { quality: number; monitoring: number; publicHealth: number; performance: number };
  service: { internetHospital: number; chronic: number; familyDoctor: number; tieredCare: number };
  suggestions: string[];
}

export default function RegionalAllianceV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/regional-alliance-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>区域医联体 V4</Title>
        <Paragraph type="secondary">城市医疗集团·县域医共体·专科联盟·远程协作 / 转诊标准·上转·下转·绿色通道 / 远程会诊·影像·病理·心电·超声·教学 / 专家坐诊·手术带教·人才培养·技术输出 / 基层培训·远程带教·处方延伸·检查互认 / 区域影像·检验·病理·心电·消毒供应中心 / 医疗质量·监测·公共卫生·应急·绩效考核 / 互联网医院·慢病·家庭医生·分级诊疗</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="医联体组织" value={data.organization.cityGroup + data.organization.countyConsortium} /></Card></Col>
              <Col span={6}><Card><Statistic title="上转" value={data.referral.up} /></Card></Col>
              <Col span={6}><Card><Statistic title="远程会诊" value={data.telemedicine.consultation} /></Card></Col>
              <Col span={6}><Card><Statistic title="分级诊疗率" value={`${data.service.tieredCare}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>医联体明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "down", name: "下转", value: data.referral.down },
                  { key: "greenChannel", name: "绿色通道", value: data.referral.greenChannel },
                  { key: "image", name: "远程影像", value: data.telemedicine.image },
                  { key: "familyDoctor", name: "家庭医生签约", value: data.service.familyDoctor },
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
