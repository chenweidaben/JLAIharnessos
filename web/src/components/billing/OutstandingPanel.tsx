/**
 * 健澜科技 jlmedaios - 待结算收费面板（M3-B）
 *
 * 输入就诊号 → 计费（幂等）→ 勾选费用 → 选择支付方式 → 一键收费（归集+收款+开票）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useState } from 'react';
import {
  Button,
  Card,
  Input,
  Radio,
  Space,
  Table,
  Tag,
  message as antdMessage,
} from 'antd';
import {
  CalculatorOutlined,
  CheckCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useBillingStore } from '@/store/billingStore';
import {
  FEE_CATEGORY_LABEL,
  FEE_STATUS_COLOR,
  FEE_STATUS_LABEL,
  type FeeItem,
} from '@/types/billing';

export default function OutstandingPanel() {
  const {
    outstanding, loading, submitting, selectedItemIds, paymentMethod,
    loadOutstanding, generate, selectAll, clearSelection,
    setSelectedItems, setPaymentMethod, checkout,
  } = useBillingStore();

  const [visitInput, setVisitInput] = useState('');

  const handleSearch = async () => {
    const id = visitInput.trim();
    if (!id) {
      antdMessage.warning('请输入就诊号或就诊ID');
      return;
    }
    // 前端按就诊ID查询；若输入的是就诊号，BFF 详情按 ID，这里先用 ID
    await loadOutstanding(id);
  };

  const handleGenerate = async () => {
    const id = visitInput.trim();
    if (!id) {
      antdMessage.warning('请先输入就诊ID');
      return;
    }
    const stats = await generate(id);
    if (stats) {
      antdMessage.success(
        `计费完成：新增 ${stats.created} 条（挂号 ${stats.registration}、诊查 ${stats.consultation}、医嘱 ${stats.orders}、药品 ${stats.drugs}）`,
      );
    }
  };

  const handleCheckout = async () => {
    const id = visitInput.trim();
    if (!id) return;
    const ok = await checkout(id);
    if (ok) antdMessage.success('收费成功，电子票据已开具');
  };

  const selectedTotal = (outstanding?.items ?? [])
    .filter((i) => selectedItemIds.includes(i.id))
    .reduce((sum, i) => sum + Number(i.amount), 0)
    .toFixed(2);

  const columns = [
    {
      title: '项目',
      dataIndex: 'itemName',
      key: 'itemName',
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      render: (v: FeeItem['category']) => (
        <Tag>{FEE_CATEGORY_LABEL[v]}</Tag>
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right' as const,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      align: 'right' as const,
      render: (v: string) => `¥${v}`,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (v: string) => <strong>¥{v}</strong>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: FeeItem['status']) => (
        <Tag color={FEE_STATUS_COLOR[v]}>{FEE_STATUS_LABEL[v]}</Tag>
      ),
    },
  ];

  return (
    <Card
      className="mb-4"
      title={
        <Space>
          <CalculatorOutlined />
          门诊收费（计费 / 收款 / 开票）
        </Space>
      }
    >
      <Space className="mb-3" wrap>
        <Input
          data-testid="billing-visit-input"
          style={{ width: 320 }}
          placeholder="请输入就诊ID（visit id）"
          value={visitInput}
          onChange={(e) => setVisitInput(e.target.value)}
          onPressEnter={() => void handleSearch()}
        />
        <Button
          type="primary"
          icon={<SearchOutlined />}
          loading={loading}
          onClick={() => void handleSearch()}
          data-testid="billing-search"
        >
          查询待结算
        </Button>
        <Button
          icon={<CalculatorOutlined />}
          loading={submitting}
          onClick={() => void handleGenerate()}
          data-testid="billing-generate"
        >
          计费（刷新费用）
        </Button>
      </Space>

      {outstanding && (
        <>
          <Space className="mb-2" wrap>
            <Button size="small" onClick={selectAll}>
              全选
            </Button>
            <Button size="small" onClick={clearSelection}>
              清空
            </Button>
            <Radio.Group
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              options={[
                { label: '现金', value: 'cash' },
                { label: '微信', value: 'wechat' },
                { label: '支付宝', value: 'alipay' },
                { label: '银行卡', value: 'bank_card' },
                { label: '医保', value: 'insurance' },
              ]}
            />
          </Space>
          <Table<FeeItem>
            rowKey="id"
            size="small"
            loading={loading}
            columns={columns}
            dataSource={outstanding.items}
            pagination={false}
            rowSelection={{
              selectedRowKeys: selectedItemIds,
              onChange: (keys) => setSelectedItems(keys.map(String)),
            }}
          />
          <div
            className="mt-3 flex items-center justify-between"
            data-testid="billing-summary"
          >
            <span>
              已选 <strong>{selectedItemIds.length}</strong> 条，合计{' '}
              <strong style={{ color: '#cf1322' }}>¥{selectedTotal}</strong>
            </span>
            <Button
              type="primary"
              size="large"
              icon={<CheckCircleOutlined />}
              loading={submitting}
              disabled={selectedItemIds.length === 0}
              onClick={() => void handleCheckout()}
              data-testid="billing-checkout"
            >
              收费并开票
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
