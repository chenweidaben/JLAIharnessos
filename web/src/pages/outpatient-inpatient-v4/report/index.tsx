/**
 * 健澜科技 jlmedaios - 门诊住院 V4 页（M252-D）
 *
 * 分时段预约率爽约率号源多渠道智能AI推荐/预检分诊专科普通专家专病智能/候诊就诊时长诊间结算一站式AI预问诊/登记评估床位分配入院须知住院证调度/使用率周转平均住院日加床预警智能调度/病程三级查房会诊转科出院计划临床路径/押金费用清单每日出院结算医保预警/出院指导小结随访预约复诊满意度准备。深海蓝 VI。
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
  outpatient: { appointment: number; noShow: number; channels: number; smart: number };
  triage: { general: number; specialist: number; disease: number; smart: number };
  visit: { wait: number; consult: number; billing: number; preIntake: number };
  admission: { registration: number; assessment: number; bedAllocation: number; slip: number };
  bed: { utilization: number; turnover: number; avgStay: number; overflow: number };
  treatment: { progress: number; rounds: number; consult: number; pathway: number };
  discharge: { guidance: number; summary: number; followup: number; satisfaction: number };
  suggestions: string[];
}

export default function OutpatientInpatientV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/outpatient-inpatient-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>门诊住院 V4</Title>
        <Paragraph type="secondary">分时段预约·爽约率·号源·多渠道·AI 推荐 / 预检分诊·专科·普通·专家·专病 / 候诊·就诊时长·诊间结算·一站式·AI 预问诊 / 登记·评估·床位分配·住院证·调度 / 使用率·周转·平均住院日·加床·预警 / 病程·三级查房·会诊·转科·临床路径 / 押金·费用清单·每日结算·医保预警 / 出院指导·小结·随访·复诊·满意度</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="预约率" value={`${data.outpatient.appointment}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="候诊时间" value={`${data.visit.wait}分钟`} /></Card></Col>
              <Col span={6}><Card><Statistic title="床位使用率" value={`${data.bed.utilization}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="平均住院日" value={`${data.bed.avgStay}天`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>门诊住院明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "noShow", name: "爽约率", value: `${data.outpatient.noShow}%` },
                  { key: "specialist", name: "专家门诊", value: data.triage.specialist },
                  { key: "turnover", name: "床位周转", value: data.bed.turnover },
                  { key: "satisfaction", name: "满意度", value: `${data.discharge.satisfaction}%` },
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
