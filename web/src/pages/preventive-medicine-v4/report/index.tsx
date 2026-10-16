/**
 * 健澜科技 jlmedaios - 预防公卫 V4 页（M249-A）
 *
 * 免疫规划二类疫苗冷链追溯不良反应/甲乙丙类传染病症状监测预警直报/高血压糖尿病脑卒中肿瘤危险因素生活方式/健康风险评估问卷体检风险评分AI预测/公共卫生应急流调密接/学生近视肥胖龋齿心理/营养监测膳食指导。深海蓝 VI。
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
  immunization: { vaccines: number; coldChain: number; adverse: number };
  surveillance: { classA: number; classB: number; warning: number };
  chronic: { hypertension: number; diabetes: number; stroke: number };
  school: { myopia: number; obesity: number; nutrition: number };
  suggestions: string[];
}

export default function PreventiveMedicineV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/preventive-medicine-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>预防医学公卫 V4</Title>
        <Paragraph type="secondary">免疫规划·二类疫苗·冷链追溯·不良反应 / 甲乙丙类传染病·症状监测·预警直报 / 高血压·糖尿病·脑卒中·肿瘤·危险因素·生活方式 / 健康风险评估·问卷·体检·风险评分·AI 预测 / 公共卫生应急·流调·密接 / 学生近视·肥胖·龋齿·心理 / 营养监测·膳食指导</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="疫苗种类" value={data.immunization.vaccines} /></Card></Col>
              <Col span={6}><Card><Statistic title="冷链监测" value={`${data.immunization.coldChain}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="高血压患者" value={data.chronic.hypertension} /></Card></Col>
              <Col span={6}><Card><Statistic title="学生近视率" value={`${data.school.myopia}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>公卫明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "classB", name: "乙类传染病", value: data.surveillance.classB },
                  { key: "warning", name: "预警次数", value: data.surveillance.warning },
                  { key: "diabetes", name: "糖尿病", value: data.chronic.diabetes },
                  { key: "obesity", name: "学生肥胖率", value: `${data.school.obesity}%` },
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
