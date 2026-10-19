/*
 * 健澜科技 jlmedaios - 联邦学习任务 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.federated_learning.repository;

import com.jlmedaios.monolith.federated_learning.entity.FederatedTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 联邦学习任务 Repository。
 */
@Repository
public interface FederatedTaskRepository extends JpaRepository<FederatedTask, Long> {

    /**
     * 按状态查询联邦学习任务。
     *
     * @param status 状态
     * @return 联邦学习任务列表
     */
    List<FederatedTask> findByStatus(String status);

    /**
     * 按任务名称查询联邦学习任务。
     *
     * @param taskName 任务名称
     * @return 联邦学习任务列表
     */
    List<FederatedTask> findByTaskName(String taskName);
}
