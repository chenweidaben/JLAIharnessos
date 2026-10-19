/*
 * 健澜科技 jlmedaios - 采购记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.drug_management.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 采购记录实体。
 *
 * <p>append-only: 采购记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "drug_purchase")
public class DrugPurchase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "purchase_no")
    private String purchaseNo;

    @Column(name = "drug_code")
    private String drugCode;

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "unit_price")
    private BigDecimal unitPrice;

    @Column(name = "total_amount")
    private BigDecimal totalAmount;

    @Column(name = "supplier")
    private String supplier;

    @Column(name = "purchase_date")
    @Builder.Default
    private LocalDate purchaseDate = LocalDate.now();

    @Column(name = "status")
    @Builder.Default
    private String status = "ORDERED";
}
