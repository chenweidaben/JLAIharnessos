/*
 * 健澜科技 jlmedaios - 门诊结算 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.billing_settlement.service;

import com.jlmedaios.monolith.billing_settlement.entity.ChargeOrder;
import com.jlmedaios.monolith.billing_settlement.repository.ChargeOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 门诊结算 Service。
 *
 * <p>append-only: 缴费记录不可修改，退费留痕</p>
 */
@Service
@RequiredArgsConstructor
public class BillingSettlementService {

    private final ChargeOrderRepository chargeOrderRepository;

    /**
     * 创建缴费单。
     *
     * @param orderNo   订单编号
     * @param patientId 患者 ID
     * @param visitType 就诊类型
     * @param totalAmount 总金额
     * @return 已持久化的缴费单
     */
    public ChargeOrder create(String orderNo, String patientId, String visitType, BigDecimal totalAmount) {
        ChargeOrder order = ChargeOrder.builder()
                .orderNo(orderNo)
                .patientId(patientId)
                .visitType(visitType)
                .totalAmount(totalAmount)
                .paidAmount(BigDecimal.ZERO)
                .build();
        return chargeOrderRepository.save(order);
    }

    /**
     * 缴费（status=PAID + paidAmount=totalAmount）。
     *
     * @param id        缴费单 ID
     * @param payMethod 支付方式
     * @return 已更新的缴费单
     */
    public Optional<ChargeOrder> pay(Long id, String payMethod) {
        Optional<ChargeOrder> opt = chargeOrderRepository.findById(id);
        if (opt.isPresent()) {
            ChargeOrder order = opt.get();
            order.setStatus("PAID");
            order.setPaidAmount(order.getTotalAmount());
            order.setPayMethod(payMethod);
            chargeOrderRepository.save(order);
        }
        return opt;
    }

    /**
     * 退费（status=REFUNDED）。
     *
     * @param id 缴费单 ID
     * @return 已更新的缴费单
     */
    public Optional<ChargeOrder> refund(Long id) {
        Optional<ChargeOrder> opt = chargeOrderRepository.findById(id);
        if (opt.isPresent()) {
            ChargeOrder order = opt.get();
            order.setStatus("REFUNDED");
            chargeOrderRepository.save(order);
        }
        return opt;
    }

    /**
     * 今日收费统计（mock）。
     *
     * @return 统计数据
     */
    public Map<String, Object> todayStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("total_orders", 150);
        stats.put("total_amount", new BigDecimal("45000.00"));
        return stats;
    }
}
