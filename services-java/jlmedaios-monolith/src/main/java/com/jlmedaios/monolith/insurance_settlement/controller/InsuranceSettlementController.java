/*
 * 健澜科技 jlmedaios - 医保结算 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.insurance_settlement.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.insurance_settlement.entity.InsuranceClaim;
import com.jlmedaios.monolith.insurance_settlement.service.InsuranceSettlementService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 医保结算 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/insurance")
public class InsuranceSettlementController {

    private final InsuranceSettlementService insuranceSettlementService;

    /**
     * 提交医保申报。
     *
     * @param body {claimNo, patientId, medicalRecordNo, insuranceType, totalAmount, insurancePay, selfPay}
     * @return Result<InsuranceClaim>
     */
    @PostMapping("/submit")
    public Result<InsuranceClaim> submit(@RequestBody Map<String, Object> body) {
        InsuranceClaim claim = insuranceSettlementService.submit(
                String.valueOf(body.get("claimNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("medicalRecordNo")),
                String.valueOf(body.get("insuranceType")),
                new BigDecimal(String.valueOf(body.get("totalAmount"))),
                new BigDecimal(String.valueOf(body.get("insurancePay"))),
                new BigDecimal(String.valueOf(body.get("selfPay")))
        );
        return Result.ok(claim);
    }

    /**
     * 审核。
     *
     * @param id   申报 ID
     * @param body {approved}
     * @return Result<InsuranceClaim>
     */
    @PutMapping("/{id}/review")
    public Result<InsuranceClaim> review(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        boolean approved = Boolean.parseBoolean(String.valueOf(body.get("approved")));
        return insuranceSettlementService.review(id, approved)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 待审核列表。
     *
     * @return Result<List<InsuranceClaim>>
     */
    @GetMapping("/pending")
    public Result<List<InsuranceClaim>> pendingList() {
        return Result.ok(insuranceSettlementService.pendingList());
    }

    /**
     * 医保结算统计。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/stats")
    public Result<Map<String, Object>> stats() {
        return Result.ok(insuranceSettlementService.stats());
    }
}
