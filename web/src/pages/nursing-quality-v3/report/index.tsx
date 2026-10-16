/**
 * 健澜科技 jlmedaios - 护理质量 V3 页（M241-C）
 *
 * 压疮跌倒坠床管路滑脱敏感指标/特级一级二级三级分级护理巡视/给药输血标本安全/床护比排班/PICC伤口造口专科。深海蓝 VI。
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
  sensitivity: { pressure: number; fall: number; tube: number };
  graded: { special: number; grade1: number; grade2: number; grade3: number };
  ratio: { bedNurse: number };
  specialty: { picc: number; wound: number; ostomy: number };
  suggestions: string[];
}

export default function NursingQualityV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/nursing-quality-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>护理质量 V3</Title>
        <Paragraph type="secondary">压疮·跌倒·坠床·管路滑脱敏感指标 / 特级·一级·二级·三级分级护理巡视 / 给药·输血·标本安全 / 床护比排班 / PICC·伤口·造口专科</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="压疮" value={data.sensitivity.pressure} /></Card></Col>
              <Col span={6}><Card><Statistic title="跌倒" value={data.sensitivity.fall} /></Card></Col>
              <Col span={6}><Card><Statistic title="特级护理" value={data.graded.special} /></Card></Col>
              <Col span={6}><Card><Statistic title="床护比" value={data.ratio.bedNurse} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>护理明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "tube", name: "管路滑脱", value: data.sensitivity.tube },
                  { key: "grade1", name: "一级护理", value: data.graded.grade1 },
                  { key: "picc", name: "PICC 专科", value: data.specialty.picc },
                  { key: "wound", name: "伤口造口", value: data.specialty.wound },
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
