/*
 * 健澜科技 jlmedaios - 仿真场景 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.hospital_digital_twin.repository;

import com.jlmedaios.monolith.hospital_digital_twin.entity.TwinScenario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 仿真场景 Repository。
 */
@Repository
public interface TwinScenarioRepository extends JpaRepository<TwinScenario, Long> {

    /**
     * 按状态查询仿真场景。
     *
     * @param status 状态
     * @return 仿真场景列表
     */
    List<TwinScenario> findByStatus(String status);

    /**
     * 按场景类型查询仿真场景。
     *
     * @param scenarioType 场景类型
     * @return 仿真场景列表
     */
    List<TwinScenario> findByScenarioType(String scenarioType);
}
