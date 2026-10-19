/*
 * 健澜科技 jlmedaios - 科研数据集 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.research_data.repository;

import com.jlmedaios.monolith.research_data.entity.ResearchDataset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 科研数据集 Repository。
 */
@Repository
public interface ResearchDatasetRepository extends JpaRepository<ResearchDataset, Long> {

    /**
     * 按项目编码查询数据集。
     *
     * @param projectCode 项目编码
     * @return 数据集列表
     */
    List<ResearchDataset> findByProjectCode(String projectCode);
}
