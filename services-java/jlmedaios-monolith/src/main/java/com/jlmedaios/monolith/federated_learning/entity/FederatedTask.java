/*
 * 健澜科技 jlmedaios - 联邦学习任务实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.federated_learning.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 联邦学习任务实体。
 *
 * <p>联邦学习任务主数据；数据不出院，只交换模型梯度；生产接 FedAvg/FedProx，H2 下 mock</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "federated_task")
public class FederatedTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_name")
    private String taskName;

    @Column(name = "task_type")
    private String taskType;

    @Column(name = "participant_count")
    private Integer participantCount;

    @Column(name = "status")
    @Builder.Default
    private String status = "INITIALIZED";

    @Column(name = "current_round")
    private Integer currentRound;

    @Column(name = "total_rounds")
    private Integer totalRounds;
}
