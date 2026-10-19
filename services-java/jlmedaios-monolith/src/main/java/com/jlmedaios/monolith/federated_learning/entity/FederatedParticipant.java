/*
 * 健澜科技 jlmedaios - 联邦参与方实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.federated_learning.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 联邦参与方实体。
 *
 * <p>append-only: 联邦参与方记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "federated_participant")
public class FederatedParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_name")
    private String taskName;

    @Column(name = "hospital_name")
    private String hospitalName;

    @Column(name = "status")
    @Builder.Default
    private String status = "JOINED";

    @Column(name = "last_round_metrics")
    private BigDecimal lastRoundMetrics;
}
