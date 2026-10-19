/*
 * 健澜科技 jlmedaios - 科研项目 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.research_data.repository;

import com.jlmedaios.monolith.research_data.entity.ResearchProject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 科研项目 Repository。
 */
@Repository
public interface ResearchProjectRepository extends JpaRepository<ResearchProject, Long> {

    /**
     * 按项目编码查询科研项目。
     *
     * @param projectCode 项目编码
     * @return 科研项目 Optional
     */
    Optional<ResearchProject> findByProjectCode(String projectCode);
}
