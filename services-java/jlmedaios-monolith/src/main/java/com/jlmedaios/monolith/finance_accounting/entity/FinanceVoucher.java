/*
 * 健澜科技 jlmedaios - 财务凭证实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.finance_accounting.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 财务凭证实体。
 *
 * <p>append-only: 财务凭证不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "finance_voucher")
public class FinanceVoucher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "voucher_no")
    private String voucherNo;

    @Column(name = "voucher_date")
    private LocalDate voucherDate;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "debit_account")
    private String debitAccount;

    @Column(name = "credit_account")
    private String creditAccount;

    @Column(name = "amount")
    private BigDecimal amount;

    @Column(name = "department")
    private String department;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "status")
    @Builder.Default
    private String status = "UNPOSTED";
}
