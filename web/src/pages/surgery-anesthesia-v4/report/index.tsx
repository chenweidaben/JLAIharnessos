/**
 * 健澜科技 jlmedaios - 手术麻醉 V4 页（M251-B）
 *
 * 手术间台次医师麻醉师连台效率智能排程/术前访视ASA分级气道评估ERAS宣教/Time Out麻醉深度生命体征液体体温肌松/PACU Steward评分术后镇痛恶心呕吐随访ERAS/部位标识器械清点SSI预防安全核查血液保护/麻精药品残余药量/日间手术中心/非计划二次手术。深海蓝 VI。
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
  schedule: { cases: number; orRooms: number; anesthesiologists: number; efficiency: number };
  preop: { visit: number; asa3: number; airway: number; eras: number };
  intraop: { timeout: number; depth: number; fluid: number; temperature: number };
  postop: { pacu: number; pain: number; ponv: number; followup: number };
  safety: { siteMarkup: number; instrumentCount: number; ssi: number; bloodSparing: number };
  suggestions: string[];
}

export default function SurgeryAnesthesiaV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/surgery-anesthesia-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>手术麻醉 V4</Title>
        <Paragraph type="secondary">手术间·台次·麻醉师·连台·智能排程 / 术前访视·ASA 分级·气道评估·ERAS / Time Out·麻醉深度·生命体征·液体·体温 / PACU·Steward·术后镇痛·PONV·随访 / 部位标识·器械清点·SSI·血液保护 / 麻精药品·日间手术·非计划二次手术</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="手术台次" value={data.schedule.cases} /></Card></Col>
              <Col span={6}><Card><Statistic title="手术间效率" value={`${data.schedule.efficiency}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="ERAS 覆盖" value={data.preop.eras} /></Card></Col>
              <Col span={6}><Card><Statistic title="SSI" value={data.safety.ssi} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>手术麻醉明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "asa3", name: "ASA III", value: data.preop.asa3 },
                  { key: "timeout", name: "Time Out", value: data.intraop.timeout },
                  { key: "pacu", name: "PACU", value: data.postop.pacu },
                  { key: "bloodSparing", name: "血液保护", value: data.safety.bloodSparing },
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
