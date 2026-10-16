/**
 * 健澜科技 jlmedaios - 绩效管理 V4 页（M250-C）
 *
 * 国考55等级年度目标重点任务党委决策战略解码/质量数量效率成本满意度安全学科发展/医生护士医技行政后勤工作量积分岗位系数/CMI时间消耗费用消耗病种结构医保结余排名/岗位工资绩效工资年薪协议项目超额激励/结果面谈改进申诉持续提升绩效档案/分布科室个人趋势预警标杆AI分析/多劳优劳质量优先患者导向持续改进文化落地。深海蓝 VI。
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
  national: { grade: string; target: number; completed: number };
  indicators: { quality: number; quantity: number; efficiency: number; satisfaction: number };
  workload: { doctor: number; nurse: number; medTech: number; admin: number };
  drg: { cmi: number; timeConsumption: number; costConsumption: number; balance: number };
  salary: { base: number; performance: number; annual: number; overtime: number };
  suggestions: string[];
}

export default function PerformanceV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/performance-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>绩效管理 V4</Title>
        <Paragraph type="secondary">国考·55 项·等级·年度目标·战略解码 / 质量·数量·效率·成本·满意度·安全 / 医生·护士·医技·行政·工作量·岗位系数 / CMI·时间消耗·费用消耗·病种结构·医保结余 / 岗位工资·绩效工资·年薪·项目·超额激励 / 结果面谈·改进·申诉·绩效档案 / 分布·科室·个人·趋势·预警·标杆 / 多劳·优劳·质量优先·患者导向·文化落地</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="国考等级" value={data.national.grade} /></Card></Col>
              <Col span={6}><Card><Statistic title="质量得分" value={data.indicators.quality} /></Card></Col>
              <Col span={6}><Card><Statistic title="CMI" value={data.drg.cmi} /></Card></Col>
              <Col span={6}><Card><Statistic title="绩效工资" value={data.salary.performance} prefix="元" /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>绩效明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "completed", name: "目标完成", value: `${data.national.completed}%` },
                  { key: "quantity", name: "数量得分", value: data.indicators.quantity },
                  { key: "nurse", name: "护士工作量", value: data.workload.nurse },
                  { key: "balance", name: "医保结余", value: `${data.drg.balance}万` },
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
