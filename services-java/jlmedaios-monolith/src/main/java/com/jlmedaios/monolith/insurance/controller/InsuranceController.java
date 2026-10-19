/*
 * 健澜科技 jlmedaios - 医保 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.insurance.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.insurance.entity.InsuranceClaim;
import com.jlmedaios.monolith.insurance.service.InsuranceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Map;

/**
 * 医保 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/insurance")
public class InsuranceController {

    private final InsuranceService insuranceService;

    /**
     * 医保结算申报。
     *
     * @param body {patientId, visitId, principalDiagnosis, otherDiagnoses, procedures, totalCost}
     * @return Result<InsuranceClaim>
     */
    @PostMapping("/claim")
    public Result<InsuranceClaim> claim(@RequestBody Map<String, Object> body) {
        InsuranceClaim claim = insuranceService.claim(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                Long.valueOf(String.valueOf(body.get("visitId"))),
                String.valueOf(body.get("principalDiagnosis")),
                String.valueOf(body.get("otherDiagnoses")),
                String.valueOf(body.get("procedures")),
                new BigDecimal(String.valueOf(body.get("totalCost")))
        );
        return Result.ok(claim);
    }

    /**
     * 按结算 ID 查询。
     *
     * @param claimId 结算 ID
     * @return Result<InsuranceClaim>
     */
    @GetMapping("/{claimId}")
    public Result<InsuranceClaim> getByClaimId(@PathVariable Long claimId) {
        return insuranceService.getByClaimId(claimId)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "医保结算记录不存在"));
    }

    /**
     * 科室医保汇总。
     *
     * @param deptCode 科室编码
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/dept/{deptCode}/summary")
    public Result<Map<String, Object>> deptSummary(@PathVariable String deptCode) {
        return Result.ok(insuranceService.deptSummary(deptCode));
    }
}
