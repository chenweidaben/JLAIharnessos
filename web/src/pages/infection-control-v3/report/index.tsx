/**
 * 健澜科技 jlmedaios - 院感控制 V3 页（M256-B）
 *
 * 依从性正确性手卫生设施宣教监测ATP/ICU新生儿手术室血液透析感染率千日感染率/MRSA/VRE/CRE/CRAB接触隔离环境消毒筛查/DDD使用率强度送检率特殊使用级会诊AMS/SSI监测预防bundle术前准备术后随访感染率/CLABSI/CAUTI/VAP bundles置管率千日感染/空气物表手消毒液紫外线洁净区微生物监测/暴发识别流调控制上报复盘聚集性发病预警。深海蓝 VI。
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
  handHygiene: { compliance: number; correctness: number; facility: number; education: number; atp: number };
  target: { icu: number; nicu: number; or: number; hd: number; rate: number; perPatientDays: number };
  mdro: { mrsa: number; vre: number; cre: number; crab: number; contactIsolation: number; environment: number; screening: number };
  antibiotic: { ddd: number; use: number; intensity: number; sendRate: number; specialTier: number; consult: number; ams: number };
  ssi: { monitor: number; preventionBundle: number; preop: number; postop: number; followup: number; rate: number };
  catheter: { clabsi: number; cauti: number; vap: number; bundles: number; lineRate: number; perThousand: number };
  environment: { air: number; surface: number; handDisinfectant: number; uv: number; cleanRoom: number; microbe: number };
  outbreak: { identification: number; epidemiology: number; control: number; report: number; review: number; clusterAlert: number };
  suggestions: string[];
}

export default function InfectionControlV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/infection-control-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>院感控制 V3</Title>
        <Paragraph type="secondary">手卫生·依从性·正确性·设施·宣教·ATP / ICU·新生儿·手术室·血液透析·感染率·千日感染率 / MRSA·VRE·CRE·CRAB·接触隔离·环境消毒·筛查 / DDD·使用率·强度·送检率·特殊使用级·AMS / SSI 监测·预防 bundle·术前·术后·随访 / CLABSI·CAUTI·VAP·bundles·置管率 / 空气·物表·手消毒液·紫外线·洁净区·微生物监测 / 暴发识别·流调·控制·上报·复盘·聚集性预警</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="手卫生依从性" value={`${data.handHygiene.compliance}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="千日感染率" value={data.target.perPatientDays} suffix="‰" /></Card></Col>
              <Col span={6}><Card><Statistic title="MRSA" value={data.mdro.mrsa} /></Card></Col>
              <Col span={6}><Card><Statistic title="CLABSI" value={data.catheter.clabsi} suffix="‰" /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>院感明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "ssi", name: "SSI 感染率", value: `${data.ssi.rate}%` },
                  { key: "antibiotic", name: "抗菌药 DDD", value: data.antibiotic.ddd },
                  { key: "outbreak", name: "暴发识别", value: data.outbreak.identification },
                  { key: "environment", name: "环境监测", value: data.environment.surface },
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
