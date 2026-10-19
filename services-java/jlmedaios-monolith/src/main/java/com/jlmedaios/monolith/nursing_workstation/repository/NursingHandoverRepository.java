/*
 * 健澜科技 jlmedaios - 护理交班记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nursing_workstation.repository;

import com.jlmedaios.monolith.nursing_workstation.entity.NursingHandover;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 护理交班记录 Repository。
 */
@Repository
public interface NursingHandoverRepository extends JpaRepository<NursingHandover, Long> {

    /**
     * 按病区编码查询护理交班记录。
     *
     * @param wardCode 病区编码
     * @return 护理交班记录列表
     */
    List<NursingHandover> findByWardCode(String wardCode);

    /**
     * 按状态查询护理交班记录。
     *
     * @param status 状态
     * @return 护理交班记录列表
     */
    List<NursingHandover> findByStatus(String status);
}
