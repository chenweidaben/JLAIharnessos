/**
 * 健澜科技 jlmedaios - 急诊急救 V4 页（M251-A）
 *
 * I-IV级红黄绿四区智能分诊AI预问诊/抢救室成功率时长设备药品气道管理/胸痛D2B卒中DNT创伤危重孕产妇绿色通道时间/留观病房时间转归安全滞留预警/输液反应PIVAS对接/批量伤员检伤灾害救援预案物资演练。深海蓝 VI。
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
  triage: { level1: number; level2: number; level3: number; level4: number };
  resuscitation: { success: number; avgTime: number; airway: number };
  greenChannel: { chestPain: number; stroke: number; trauma: number };
  observation: { avgStay: number; safeRate: number };
  disaster: { drill: number; massCasualty: number };
  suggestions: string[];
}

export default function EmergencyV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/emergency-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>急诊急救 V4</Title>
        <Paragraph type="secondary">I-IV 级·红黄绿四区·智能分诊·AI 预问诊 / 抢救室·成功率·时长·气道管理 / 胸痛·D2B·卒中·DNT·创伤·绿色通道 / 留观·转归·安全滞留预警 / 输液反应·PIVAS / 批量伤员·检伤·灾害救援·演练</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="I 级分诊" value={data.triage.level1} /></Card></Col>
              <Col span={6}><Card><Statistic title="抢救成功率" value={`${data.resuscitation.success}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="胸痛绿色通道" value={data.greenChannel.chestPain} /></Card></Col>
              <Col span={6}><Card><Statistic title="留观安全率" value={`${data.observation.safeRate}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>急诊明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "level2", name: "II 级", value: data.triage.level2 },
                  { key: "avgTime", name: "平均抢救时间", value: `${data.resuscitation.avgTime}分钟` },
                  { key: "stroke", name: "卒中绿色通道", value: data.greenChannel.stroke },
                  { key: "drill", name: "灾害演练", value: data.disaster.drill },
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
