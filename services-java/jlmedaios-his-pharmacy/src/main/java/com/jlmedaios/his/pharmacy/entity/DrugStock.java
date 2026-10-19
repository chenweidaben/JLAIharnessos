/*
 * 健澜科技 jlmedaios - 药品库存实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.pharmacy.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 药品库存实体。
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "drug_stock")
public class DrugStock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "drug_code")
    private String drugCode;

    @Column(name = "drug_name")
    private String drugName;

    @Column(name = "stock_qty")
    private Integer stockQty;

    @Column(name = "unit_price", precision = 10, scale = 2)
    private BigDecimal unitPrice;
}
