/*
 * 健澜科技 jlmedaios - 检验工作项 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.lab_workstation.repository;

import com.jlmedaios.monolith.lab_workstation.entity.LabWorkItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 检验工作项 Repository。
 */
@Repository
public interface LabWorkItemRepository extends JpaRepository<LabWorkItem, Long> {

    /**
     * 按标本状态查询检验工作项。
     *
     * @param sampleStatus 标本状态
     * @return 检验工作项列表
     */
    List<LabWorkItem> findBySampleStatus(String sampleStatus);

    /**
     * 按患者 ID 查询检验工作项。
     *
     * @param patientId 患者 ID
     * @return 检验工作项列表
     */
    List<LabWorkItem> findByPatientId(String patientId);

    /**
     * 按工作项编号查询检验工作项（P3 性能优化：替代 findAll().filter()）。
     *
     * @param workItemNo 工作项编号
     * @return 检验工作项
     */
    LabWorkItem findByWorkItemNo(String workItemNo);
}
