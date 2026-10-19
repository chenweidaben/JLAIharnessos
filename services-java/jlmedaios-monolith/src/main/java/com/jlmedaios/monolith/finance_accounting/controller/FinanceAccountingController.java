/*
 * 健澜科技 jlmedaios - 财务核算 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.finance_accounting.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.finance_accounting.entity.FinanceVoucher;
import com.jlmedaios.monolith.finance_accounting.service.FinanceAccountingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 财务核算 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/finance")
public class FinanceAccountingController {

    private final FinanceAccountingService financeAccountingService;

    /**
     * 创建凭证。
     *
     * @param body {voucherNo, summary, debitAccount, creditAccount, amount, department, createdBy}
     * @return Result<FinanceVoucher>
     */
    @PostMapping("/voucher")
    public Result<FinanceVoucher> createVoucher(@RequestBody Map<String, Object> body) {
        FinanceVoucher voucher = financeAccountingService.createVoucher(
                String.valueOf(body.get("voucherNo")),
                String.valueOf(body.get("summary")),
                String.valueOf(body.get("debitAccount")),
                String.valueOf(body.get("creditAccount")),
                new BigDecimal(String.valueOf(body.get("amount"))),
                String.valueOf(body.get("department")),
                String.valueOf(body.get("createdBy"))
        );
        return Result.ok(voucher);
    }

    /**
     * 过账。
     *
     * @param id 凭证 ID
     * @return Result<FinanceVoucher>
     */
    @PutMapping("/voucher/{id}/post")
    public Result<FinanceVoucher> post(@PathVariable Long id) {
        return financeAccountingService.post(id)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 凭证列表。
     *
     * @param department 科室（可空）
     * @return Result<List<FinanceVoucher>>
     */
    @GetMapping("/vouchers")
    public Result<List<FinanceVoucher>> voucherList(@RequestParam(required = false) String department) {
        return Result.ok(financeAccountingService.voucherList(department));
    }

    /**
     * 日报表。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/daily-report")
    public Result<Map<String, Object>> dailyReport() {
        return Result.ok(financeAccountingService.dailyReport());
    }
}
