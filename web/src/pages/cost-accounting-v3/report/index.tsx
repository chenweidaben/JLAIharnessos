/**
 * 健澜科技 jlmedaios - 医院成本核算 V3 页（M240-B）
 *
 * 科室四级分摊全成本/项目成本/DRG病种标准成本/成本结构动因/预算定额控制。深海蓝 VI。
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
  dept: { fullCost: number; allocated: number };
  project: { cost: number };
  drg: { standard: number; cases: number };
  budget: { controlled: number };
  suggestions: string[];
}

export default function CostAccountingV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/cost-accounting-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>医院成本核算 V3</Title>
        <Paragraph type="secondary">科室四级分摊·全成本 / 项目成本 / DRG 病种标准成本 / 成本结构·动因 / 预算定额控制</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="科室全成本" value={data.dept.fullCost} /></Card></Col>
              <Col span={6}><Card><Statistic title="四级分摊" value={data.dept.allocated} /></Card></Col>
              <Col span={6}><Card><Statistic title="DRG 病例" value={data.drg.cases} /></Card></Col>
              <Col span={6}><Card><Statistic title="预算控制率" value={`${Math.round((data.budget.controlled / data.dept.fullCost) * 100)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>成本明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "project", name: "项目成本", value: data.project.cost },
                  { key: "standard", name: "DRG 标准成本", value: data.drg.standard },
                  { key: "budget", name: "已控制预算", value: data.budget.controlled },
                  { key: "dept2", name: "分摊后", value: data.dept.allocated },
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
