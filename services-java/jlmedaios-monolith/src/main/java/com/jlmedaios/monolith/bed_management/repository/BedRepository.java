/*
 * 健澜科技 jlmedaios - 床位 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.bed_management.repository;

import com.jlmedaios.monolith.bed_management.entity.Bed;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 床位 Repository。
 */
@Repository
public interface BedRepository extends JpaRepository<Bed, Long> {

    /**
     * 按病区查询床位。
     *
     * @param wardCode 病区编码
     * @return 床位列表
     */
    List<Bed> findByWardCode(String wardCode);

    /**
     * 按状态查询床位。
     *
     * @param status 状态
     * @return 床位列表
     */
    List<Bed> findByStatus(String status);
}
