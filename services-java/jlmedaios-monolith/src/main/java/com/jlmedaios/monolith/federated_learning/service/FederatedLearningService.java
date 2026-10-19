/*
 * 健澜科技 jlmedaios - 联邦学习 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.federated_learning.service;

import com.jlmedaios.monolith.federated_learning.entity.FederatedParticipant;
import com.jlmedaios.monolith.federated_learning.entity.FederatedTask;
import com.jlmedaios.monolith.federated_learning.repository.FederatedParticipantRepository;
import com.jlmedaios.monolith.federated_learning.repository.FederatedTaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 联邦学习 Service。
 *
 * <p>联邦学习任务主数据；数据不出院，只交换模型梯度；生产接 FedAvg/FedProx，H2 下 mock</p>
 */
@Service
@RequiredArgsConstructor
public class FederatedLearningService {

    private final FederatedTaskRepository federatedTaskRepository;
    private final FederatedParticipantRepository federatedParticipantRepository;

    /**
     * 联邦任务列表。
     *
     * @return 联邦学习任务列表
     */
    public List<FederatedTask> taskList() {
        return federatedTaskRepository.findAll();
    }

    /**
     * 创建联邦任务。
     *
     * @param taskName   任务名称
     * @param taskType   任务类型
     * @param totalRounds 总轮次
     * @return 已持久化的联邦学习任务
     */
    public FederatedTask createTask(String taskName, String taskType, Integer totalRounds) {
        FederatedTask task = FederatedTask.builder()
                .taskName(taskName)
                .taskType(taskType)
                .participantCount(0)
                .status("INITIALIZED")
                .currentRound(0)
                .totalRounds(totalRounds)
                .build();
        return federatedTaskRepository.save(task);
    }

    /**
     * 启动训练（status=TRAINING）。
     *
     * @param taskName 任务名称
     * @return 已启动的联邦学习任务
     */
    public FederatedTask startTraining(String taskName) {
        List<FederatedTask> tasks = federatedTaskRepository.findByTaskName(taskName);
        if (tasks.isEmpty()) {
            return null;
        }
        FederatedTask task = tasks.get(0);
        task.setStatus("TRAINING");
        task.setCurrentRound(1);
        return federatedTaskRepository.save(task);
    }

    /**
     * 参与方列表。
     *
     * @param taskName 任务名称
     * @return 联邦参与方列表
     */
    public List<FederatedParticipant> participants(String taskName) {
        return federatedParticipantRepository.findByTaskName(taskName);
    }
}
