/**
 * 健澜科技 jlmedaios - 护理 V4 页（M252-A）
 *
 * 特级一二三级护理巡视计划措施效果/压疮跌倒坠床管路滑脱不良事件护士配比疼痛评估/体温单医嘱单护理记录评估单AI辅助记录/给药输血标本身份约束保护跌倒预防/床护比护患比排班加班离职倦怠弹性/PICC伤口造口ICU急诊血液肿瘤手术室助产静疗/护理部科护士长护士长三级质控PDCA/满意度宣教出院指导延续护理上门互联网+护理。深海蓝 VI。
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
  level: { special: number; level1: number; level2: number; level3: number };
  sensitive: { pressure: number; fall: number; tube: number; pain: number };
  staffing: { bedRatio: number; nurseRatio: number; overtime: number; turnover: number };
  specialty: { picc: number; wound: number; icu: number; or: number };
  quality: { threeLevel: number; pdca: number; satisfaction: number };
  service: { education: number; dischargeGuidance: number; onlineCare: number };
  suggestions: string[];
}

export default function NursingV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/nursing-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>护理 V4</Title>
        <Paragraph type="secondary">特级·一二三级·巡视·计划·效果 / 压疮·跌倒·管路滑脱·不良事件·疼痛 / 体温单·医嘱单·护理记录·AI 辅助 / 给药·输血·标本·身份·约束·预防 / 床护比·护患比·排班·加班·离职·弹性 / PICC·伤口·造口·ICU·手术室·静疗 / 三级质控·PDCA / 满意度·宣教·出院指导·互联网+护理</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="特级护理" value={data.level.special} /></Card></Col>
              <Col span={6}><Card><Statistic title="压疮" value={data.sensitive.pressure} /></Card></Col>
              <Col span={6}><Card><Statistic title="床护比" value={data.staffing.bedRatio} /></Card></Col>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.quality.satisfaction}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>护理明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "level1", name: "一级护理", value: data.level.level1 },
                  { key: "fall", name: "跌倒", value: data.sensitive.fall },
                  { key: "picc", name: "PICC", value: data.specialty.picc },
                  { key: "onlineCare", name: "互联网+护理", value: data.service.onlineCare },
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
