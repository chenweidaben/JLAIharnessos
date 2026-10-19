/*
 * 健澜科技 jlmedaios - 数据资产实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.data_platform.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 数据资产实体。
 *
 * <p>数据资产主数据；数据资产目录+血缘追踪，生产接 DataHub/Atlas</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "data_asset")
public class DataAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "asset_code")
    private String assetCode;

    @Column(name = "asset_name")
    private String assetName;

    @Column(name = "category")
    private String category;

    @Column(name = "source_system")
    private String sourceSystem;

    @Column(name = "owner_dept")
    private String ownerDept;

    @Column(name = "sensitivity_level")
    private String sensitivityLevel;

    @Column(name = "retention_years")
    private Integer retentionYears;
}
