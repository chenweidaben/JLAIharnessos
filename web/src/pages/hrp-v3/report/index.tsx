/**
 * 健澜科技 jlmedaios - HRP V3 页（M240-D）
 *
 * 人力资源财务资产物资一体/总账应收应付固定资产预算/SPD采购库存追溯/合同项目管理/HRP-HIS集成。深海蓝 VI。
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
  hr: { headcount: number };
  finance: { revenue: number; cost: number };
  supply: { spd: number; contract: number };
  project: number;
  integration: { hrpHIS: boolean };
  suggestions: string[];
}

export default function HRPV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/hrp-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>HRP V3 医院资源规划</Title>
        <Paragraph type="secondary">人力资源·财务·资产·物资一体 / 总账·应收应付·固定资产·预算 / SPD 采购·库存追溯 / 合同·项目管理 / HRP-HIS 集成</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="员工总数" value={data.hr.headcount} /></Card></Col>
              <Col span={6}><Card><Statistic title="年收入" value={data.finance.revenue} /></Card></Col>
              <Col span={6}><Card><Statistic title="SPD 采购" value={data.supply.spd} /></Card></Col>
              <Col span={6}><Card><Statistic title="HRP-HIS 集成" value={data.integration.hrpHIS ? "已集成" : "未集成"} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>HRP 明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "cost", name: "年成本", value: data.finance.cost },
                  { key: "contract", name: "合同数", value: data.supply.contract },
                  { key: "project", name: "在建项目", value: data.project },
                  { key: "margin", name: "结余", value: data.finance.revenue - data.finance.cost },
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
