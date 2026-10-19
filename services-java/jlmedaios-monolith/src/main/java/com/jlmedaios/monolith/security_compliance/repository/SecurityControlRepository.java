/*
 * 健澜科技 jlmedaios - 等保控制点 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.security_compliance.repository;

import com.jlmedaios.monolith.security_compliance.entity.SecurityControl;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 等保控制点 Repository。
 */
@Repository
public interface SecurityControlRepository extends JpaRepository<SecurityControl, Long> {

    /**
     * 按类别查询等保控制点。
     *
     * @param controlCategory 类别
     * @return 等保控制点列表
     */
    List<SecurityControl> findByControlCategory(String controlCategory);

    /**
     * 按状态查询等保控制点。
     *
     * @param status 状态
     * @return 等保控制点列表
     */
    List<SecurityControl> findByStatus(String status);
}
