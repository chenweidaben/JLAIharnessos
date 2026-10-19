/*
 * 健澜科技 jlmedaios - 固定资产实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.asset_management.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 固定资产实体。
 *
 * <p>固定资产主数据</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "fixed_asset")
public class FixedAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "asset_code")
    private String assetCode;

    @Column(name = "asset_name")
    private String assetName;

    @Column(name = "category")
    private String category;

    @Column(name = "purchase_date")
    private LocalDate purchaseDate;

    @Column(name = "original_value")
    private BigDecimal originalValue;

    @Column(name = "department")
    private String department;

    @Column(name = "location")
    private String location;

    @Column(name = "status")
    @Builder.Default
    private String status = "IN_USE";
}
