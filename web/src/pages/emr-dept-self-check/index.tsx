/**
 * 健澜科技 jlmedaios - 病历质控科室自查前端页（M474-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：自查表单（检查项 checkbox 列表）+ 得分实时显示。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Checkbox, Layout, List, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface SelfCheckItem {
  name: string;
  passed: boolean;
}

const defaultItems: SelfCheckItem[] = [
  { name: "主诉完整", passed: false },
  { name: "现病史规范", passed: false },
  { name: "诊断明确", passed: false },
  { name: "既往史完整", passed: false },
  { name: "体格检查记录", passed: false },
];

export default function EmrDeptSelfCheckPage() {
  const [items, setItems] = useState<SelfCheckItem[]>(defaultItems);

  const passedCount = items.filter((i) => i.passed).length;
  const score = items.length === 0 ? 0 : Math.round((passedCount / items.length) * 100);

  const toggle = (index: number) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, passed: !item.passed } : item)));
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控科室自查</Title>
        <Card style={{ marginBottom: 16 }}>
          <Text strong>当前得分：</Text>
          <Title level={2} style={{ color: VI.accent, margin: 0, display: "inline-block", marginLeft: 12 }}>
            {score}
          </Title>
          <Text type="secondary" style={{ marginLeft: 8 }}>/ 100</Text>
        </Card>
        <Card title="检查项列表" headStyle={{ background: VI.mid, color: "#fff" }}>
          <List
            dataSource={items}
            renderItem={(item: SelfCheckItem, index: number) => (
              <List.Item>
                <Checkbox checked={item.passed} onChange={() => toggle(index)}>
                  {item.name}
                </Checkbox>
              </List.Item>
            )}
          />
          <Button type="primary" style={{ marginTop: 16, background: VI.accent }}>提交自查</Button>
        </Card>
      </Content>
    </Layout>
  );
}
