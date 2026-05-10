package com.kanban.repository;

import com.kanban.model.Card;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CardRepository extends JpaRepository<Card, Long> {

    List<Card> findByColumnIdOrderByPositionAsc(Long columnId);

    @Query("SELECT c FROM Card c WHERE c.column.board.id = :boardId AND c.completedAt IS NOT NULL ORDER BY c.completedAt ASC")
    List<Card> findCompletedCardsByBoardId(@Param("boardId") Long boardId);

    @Query("SELECT c FROM Card c WHERE c.column.board.id = :boardId")
    List<Card> findAllByBoardId(@Param("boardId") Long boardId);
}
