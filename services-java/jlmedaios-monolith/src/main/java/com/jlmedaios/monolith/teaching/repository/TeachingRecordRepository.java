/*
 * 健澜科技 jlmedaios - 教学记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.teaching.repository;

import com.jlmedaios.monolith.teaching.entity.TeachingRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 教学记录 Repository。
 */
@Repository
public interface TeachingRecordRepository extends JpaRepository<TeachingRecord, Long> {

    /**
     * 按学员姓名查询教学记录。
     *
     * @param traineeName 学员姓名
     * @return 教学记录列表
     */
    List<TeachingRecord> findByTraineeName(String traineeName);
}
