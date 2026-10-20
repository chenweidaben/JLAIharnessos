/*
 * 健澜科技 jlmedaios - 影像工作项 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.radiology_workstation.repository;

import com.jlmedaios.monolith.radiology_workstation.entity.RadiologyWorkItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 影像工作项 Repository。
 */
@Repository
public interface RadiologyWorkItemRepository extends JpaRepository<RadiologyWorkItem, Long> {

    /**
     * 按检查状态查询影像工作项。
     *
     * @param studyStatus 检查状态
     * @return 影像工作项列表
     */
    List<RadiologyWorkItem> findByStudyStatus(String studyStatus);

    /**
     * 按患者 ID 查询影像工作项。
     *
     * @param patientId 患者 ID
     * @return 影像工作项列表
     */
    List<RadiologyWorkItem> findByPatientId(String patientId);

    /**
     * 按工作项编号查询影像工作项（P3 性能优化：替代 findAll().filter()）。
     *
     * @param workItemNo 工作项编号
     * @return 影像工作项
     */
    RadiologyWorkItem findByWorkItemNo(String workItemNo);
}
