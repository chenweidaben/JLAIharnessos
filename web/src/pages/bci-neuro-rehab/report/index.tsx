/**
 * 健澜科技 jlmedaios - 脑机接口与神经康复 页（M237-B）
 *
 * 脑电采集/信号解码/神经反馈/TMS/tDCS/DBS神经调控/上下肢康复机器人外骨骼/卒中脊髓损伤AI康复处方。深海蓝 VI。
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
  bci: { acquisition: number; decoding: number; neurofeedback: number };
  stimulation: { tms: number; tdcs: number; dbs: number };
  robot: { upperLimb: number; lowerLimb: number; exoskeleton: number };
  stroke: { patients: number };
  sci: { patients: number };
  suggestions: string[];
}

export default function BCINeuroRehabPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/bci-neuro-rehab/report");
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
        <Title level={3} style={{ color: VI.deep }}>脑机接口与神经康复</Title>
        <Paragraph type="secondary">脑电采集·信号解码·神经反馈 / TMS·tDCS·DBS 神经调控 / 上下肢康复机器人·外骨骼 / 卒中·脊髓损伤 AI 康复处方</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="脑电采集" value={data.bci.acquisition} /></Card></Col>
              <Col span={6}><Card><Statistic title="TMS 治疗" value={data.stimulation.tms} /></Card></Col>
              <Col span={6}><Card><Statistic title="卒中患者" value={data.stroke.patients} /></Card></Col>
              <Col span={6}><Card><Statistic title="外骨骼" value={data.robot.exoskeleton} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>神经康复明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "decode", name: "信号解码", value: data.bci.decoding },
                  { key: "tdcs", name: "tDCS", value: data.stimulation.tdcs },
                  { key: "upper", name: "上肢机器人", value: data.robot.upperLimb },
                  { key: "sci", name: "脊髓损伤", value: data.sci.patients },
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
