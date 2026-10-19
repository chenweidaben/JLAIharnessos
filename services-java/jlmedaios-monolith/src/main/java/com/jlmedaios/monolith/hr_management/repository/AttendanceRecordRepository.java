/*
 * 健澜科技 jlmedaios - 考勤记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.hr_management.repository;

import com.jlmedaios.monolith.hr_management.entity.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 考勤记录 Repository。
 */
@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {

    /**
     * 按工号查询考勤记录。
     *
     * @param employeeNo 工号
     * @return 考勤记录列表
     */
    List<AttendanceRecord> findByEmployeeNo(String employeeNo);
}
