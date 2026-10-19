/*
 * 健澜科技 jlmedaios - 随访任务 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.followup.repository;

import com.jlmedaios.monolith.followup.entity.FollowupTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 随访任务 Repository。
 */
@Repository
public interface FollowupTaskRepository extends JpaRepository<FollowupTask, Long> {

    /**
     * 按状态查询随访任务列表。
     *
     * @param status 状态
     * @return 随访任务列表
     */
    List<FollowupTask> findByStatus(String status);

    /**
     * 按患者 ID 查询随访任务列表。
     *
     * @param patientId 患者 ID
     * @return 随访任务列表
     */
    List<FollowupTask> findByPatientId(Long patientId);
}
