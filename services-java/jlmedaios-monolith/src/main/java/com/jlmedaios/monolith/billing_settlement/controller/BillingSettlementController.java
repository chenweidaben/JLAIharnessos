/*
 * 健澜科技 jlmedaios - 门诊结算 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.billing_settlement.controller;

import com.jlmedaios.monolith.billing_settlement.entity.ChargeOrder;
import com.jlmedaios.monolith.billing_settlement.service.BillingSettlementService;
import com.jlmedaios.monolith.common.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

/**
 * 门诊结算 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/billing")
public class BillingSettlementController {

    private final BillingSettlementService billingSettlementService;

    /**
     * 创建缴费单。
     *
     * @param body {orderNo, patientId, visitType, totalAmount}
     * @return Result<ChargeOrder>
     */
    @PostMapping("/create")
    public Result<ChargeOrder> create(@RequestBody Map<String, Object> body) {
        ChargeOrder order = billingSettlementService.create(
                String.valueOf(body.get("orderNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("visitType")),
                new BigDecimal(String.valueOf(body.get("totalAmount")))
        );
        return Result.ok(order);
    }

    /**
     * 缴费。
     *
     * @param id   缴费单 ID
     * @param body {payMethod}
     * @return Result<ChargeOrder>
     */
    @PutMapping("/{id}/pay")
    public Result<ChargeOrder> pay(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return billingSettlementService.pay(id, String.valueOf(body.get("payMethod")))
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 退费。
     *
     * @param id 缴费单 ID
     * @return Result<ChargeOrder>
     */
    @PutMapping("/{id}/refund")
    public Result<ChargeOrder> refund(@PathVariable Long id) {
        return billingSettlementService.refund(id)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 今日收费统计。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/today")
    public Result<Map<String, Object>> todayStats() {
        return Result.ok(billingSettlementService.todayStats());
    }
}
