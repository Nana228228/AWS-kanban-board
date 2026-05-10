package com.kanban.repository;

import com.kanban.model.Board;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BoardRepository extends JpaRepository<Board, Long> {

    List<Board> findByProjectIdOrderByStartDateAsc(Long projectId);

    @Query("SELECT b FROM Board b WHERE b.project.id = :projectId AND b.startDate <= :endDate AND b.endDate >= :startDate AND b.id != :excludeId")
    List<Board> findOverlappingBoards(@Param("projectId") Long projectId,
                                     @Param("startDate") LocalDate startDate,
                                     @Param("endDate") LocalDate endDate,
                                     @Param("excludeId") Long excludeId);

    @Query("SELECT b FROM Board b WHERE b.project.id = :projectId AND b.startDate <= :endDate AND b.endDate >= :startDate")
    List<Board> findOverlappingBoards(@Param("projectId") Long projectId,
                                     @Param("startDate") LocalDate startDate,
                                     @Param("endDate") LocalDate endDate);
}
