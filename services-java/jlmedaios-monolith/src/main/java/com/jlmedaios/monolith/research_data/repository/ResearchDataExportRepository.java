/*
 * 健澜科技 jlmedaios - 科研数据导出 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.research_data.repository;

import com.jlmedaios.monolith.research_data.entity.ResearchDataExport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 科研数据导出 Repository。
 */
@Repository
public interface ResearchDataExportRepository extends JpaRepository<ResearchDataExport, Long> {

    /**
     * 按项目 ID 查询导出记录。
     *
     * @param projectId 项目 ID
     * @return 导出记录列表
     */
    List<ResearchDataExport> findByProjectId(Long projectId);
}
