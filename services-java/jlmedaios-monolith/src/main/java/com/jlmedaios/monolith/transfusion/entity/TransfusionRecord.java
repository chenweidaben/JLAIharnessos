/*
 * 健澜科技 jlmedaios - 输血记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.transfusion.entity;

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

import java.time.LocalDateTime;

/**
 * 输血记录实体。
 *
 * <p>append-only: 输血记录不可修改，含输血前八项核对</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "transfusion_record")
public class TransfusionRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "blood_type")
    private String bloodType;

    @Column(name = "component_type")
    private String componentType;

    @Column(name = "volume_ml")
    private Integer volumeML;

    @Column(name = "donor_number")
    private String donorNumber;

    @Column(name = "status")
    @Builder.Default
    private String status = "REQUESTED";

    // 血型鉴定
    @Column(name = "pre_test_blood_type")
    @Builder.Default
    private Boolean preTestBloodType = false;

    // 交叉配血
    @Column(name = "pre_test_crossmatch")
    @Builder.Default
    private Boolean preTestCrossmatch = false;

    // 乙肝表面抗原
    @Column(name = "pre_test_hbsag")
    @Builder.Default
    private Boolean preTestHbsAg = false;

    // 丙肝抗体
    @Column(name = "pre_test_anti_hcv")
    @Builder.Default
    private Boolean preTestAntiHcv = false;

    // 艾滋抗体
    @Column(name = "pre_test_anti_hiv")
    @Builder.Default
    private Boolean preTestAntiHiv = false;

    // 梅毒抗体
    @Column(name = "pre_test_anti_tp")
    @Builder.Default
    private Boolean preTestAntiTp = false;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
