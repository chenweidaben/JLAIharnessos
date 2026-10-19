/*
 * 健澜科技 jlmedaios - 手术工作项 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.or_workstation.repository;

import com.jlmedaios.monolith.or_workstation.entity.ORWorkItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 手术工作项 Repository。
 */
@Repository
public interface ORWorkItemRepository extends JpaRepository<ORWorkItem, Long> {

    /**
     * 按状态查询手术工作项。
     *
     * @param status 状态
     * @return 手术工作项列表
     */
    List<ORWorkItem> findByStatus(String status);

    /**
     * 按患者 ID 查询手术工作项。
     *
     * @param patientId 患者 ID
     * @return 手术工作项列表
     */
    List<ORWorkItem> findByPatientId(String patientId);
}
