/*
 * 健澜科技 jlmedaios - 联邦参与方 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.federated_learning.repository;

import com.jlmedaios.monolith.federated_learning.entity.FederatedParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 联邦参与方 Repository。
 */
@Repository
public interface FederatedParticipantRepository extends JpaRepository<FederatedParticipant, Long> {

    /**
     * 按任务名称查询联邦参与方。
     *
     * @param taskName 任务名称
     * @return 联邦参与方列表
     */
    List<FederatedParticipant> findByTaskName(String taskName);
}
