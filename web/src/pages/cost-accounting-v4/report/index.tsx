/**
 * 健澜科技 jlmedaios - 成本核算 V4 页（M250-B）
 *
 * 科室直接间接分摊全成本盈亏成本动因/医疗服务技术劳务设备耗材作业成本法/DRG-DIP标准实际成本临床路径成本/四级公摊管理医辅医技临床分摊/结构差异动因趋势控制点对标AI分析/预算定额预警节约奖励浪费成本否决/数据采集分摊参数成本中心报表自动化/定价医保绩效资源配置投资运营优化。深海蓝 VI。
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
  department: { direct: number; indirect: number; full: number; profit: number };
  service: { labor: number; equipment: number; supplies: number };
  drg: { standard: number; actual: number; pathway: number };
  allocation: { admin: number; logistics: number; medTech: number };
  control: { budget: number; saving: number; waste: number };
  suggestions: string[];
}

export default function CostAccountingV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/cost-accounting-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>成本核算 V4</Title>
        <Paragraph type="secondary">科室·直接·间接·分摊·全成本·盈亏 / 医疗服务·技术·劳务·设备·耗材·作业成本法 / DRG·DIP·标准·实际·临床路径成本 / 四级公摊·管理·医辅·医技·临床分摊 / 结构·差异·动因·趋势·控制点·对标 / 预算·定额·预警·节约·浪费·成本否决 / 数据采集·分摊参数·成本中心·报表自动化 / 定价·医保·绩效·资源配置·投资运营</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="直接成本" value={data.department.direct} prefix="万" /></Card></Col>
              <Col span={6}><Card><Statistic title="全成本" value={data.department.full} prefix="万" /></Card></Col>
              <Col span={6}><Card><Statistic title="DRG 实际成本" value={data.drg.actual} prefix="元" /></Card></Col>
              <Col span={6}><Card><Statistic title="节约" value={data.control.saving} prefix="万" /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>成本明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "indirect", name: "间接成本", value: `${data.department.indirect}万` },
                  { key: "labor", name: "技术劳务", value: `${data.service.labor}万` },
                  { key: "supplies", name: "耗材", value: `${data.service.supplies}万` },
                  { key: "waste", name: "浪费", value: `${data.control.waste}万` },
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
