/*
 * 健澜科技 jlmedaios - 互联互通评级指标实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.interconnection_rating.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 互联互通评级指标实体。
 *
 * <p>互联互通评级指标主数据；对应国家卫健委互联互通成熟度四级甲等/五级乙等标准</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "interconnection_item")
public class InterconnectionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "item_code")
    private String itemCode;

    @Column(name = "item_name")
    private String itemName;

    @Column(name = "category")
    private String category;

    @Column(name = "score")
    private BigDecimal score;

    @Column(name = "max_score")
    private BigDecimal maxScore;

    @Column(name = "status")
    @Builder.Default
    private String status = "NOT_ACHIEVED";
}
