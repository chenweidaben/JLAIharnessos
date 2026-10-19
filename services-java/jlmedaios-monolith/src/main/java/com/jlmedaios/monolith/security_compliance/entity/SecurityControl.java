/*
 * 健澜科技 jlmedaios - 等保控制点实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.security_compliance.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 等保控制点实体。
 *
 * <p>等保控制点主数据；对应网络安全等级保护三级要求，定期巡检</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "security_control")
public class SecurityControl {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "control_code")
    private String controlCode;

    @Column(name = "control_category")
    private String controlCategory;

    @Column(name = "control_item")
    private String controlItem;

    @Column(name = "status")
    @Builder.Default
    private String status = "NOT_CHECKED";

    @Column(name = "last_check_time")
    private LocalDateTime lastCheckTime;

    @Column(name = "next_check_time")
    private LocalDate nextCheckTime;
}
