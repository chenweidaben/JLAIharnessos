/*
 * 健澜科技 jlmedaios - 住院 episode Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.inpatient_workflow.repository;

import com.jlmedaios.monolith.inpatient_workflow.entity.InpatientEpisode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 住院 episode Repository。
 */
@Repository
public interface InpatientEpisodeRepository extends JpaRepository<InpatientEpisode, Long> {

    /**
     * 按状态查询住院 episode。
     *
     * @param status 状态
     * @return 住院 episode 列表
     */
    List<InpatientEpisode> findByStatus(String status);
}
