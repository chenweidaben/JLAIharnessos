/*
 * 健澜科技 jlmedaios - 财务核算 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.finance_accounting.service;

import com.jlmedaios.monolith.finance_accounting.entity.FinanceVoucher;
import com.jlmedaios.monolith.finance_accounting.repository.FinanceVoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 财务核算 Service。
 *
 * <p>append-only: 财务凭证不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class FinanceAccountingService {

    private final FinanceVoucherRepository financeVoucherRepository;

    /**
     * 创建凭证。
     *
     * @param voucherNo     凭证编号
     * @param summary       摘要
     * @param debitAccount  借方科目
     * @param creditAccount 贷方科目
     * @param amount        金额
     * @param department    科室
     * @param createdBy     创建人
     * @return 已持久化的凭证
     */
    public FinanceVoucher createVoucher(String voucherNo, String summary, String debitAccount,
                                         String creditAccount, BigDecimal amount, String department,
                                         String createdBy) {
        FinanceVoucher voucher = FinanceVoucher.builder()
                .voucherNo(voucherNo)
                .voucherDate(LocalDate.now())
                .summary(summary)
                .debitAccount(debitAccount)
                .creditAccount(creditAccount)
                .amount(amount)
                .department(department)
                .createdBy(createdBy)
                .build();
        return financeVoucherRepository.save(voucher);
    }

    /**
     * 过账（status=POSTED）。
     *
     * @param id 凭证 ID
     * @return 已更新的凭证
     */
    public Optional<FinanceVoucher> post(Long id) {
        Optional<FinanceVoucher> opt = financeVoucherRepository.findById(id);
        if (opt.isPresent()) {
            FinanceVoucher voucher = opt.get();
            voucher.setStatus("POSTED");
            financeVoucherRepository.save(voucher);
        }
        return opt;
    }

    /**
     * 凭证列表。
     *
     * @param department 科室（可空）
     * @return 凭证列表
     */
    public List<FinanceVoucher> voucherList(String department) {
        if (department != null && !department.isEmpty()) {
            return financeVoucherRepository.findByDepartment(department);
        }
        return financeVoucherRepository.findAll();
    }

    /**
     * 日报表（mock）。
     *
     * @return 日报表数据
     */
    public Map<String, Object> dailyReport() {
        Map<String, Object> report = new HashMap<>();
        report.put("total_income", new BigDecimal("500000.00"));
        report.put("total_expense", new BigDecimal("320000.00"));
        report.put("net", new BigDecimal("180000.00"));
        return report;
    }
}
