package com.kanban.service;

import com.kanban.dto.response.BurndownDataResponse;
import com.kanban.exception.ResourceNotFoundException;
import com.kanban.model.Board;
import com.kanban.model.Card;
import com.kanban.repository.BoardRepository;
import com.kanban.repository.CardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BurndownService {

    private final BoardRepository boardRepository;
    private final CardRepository cardRepository;

    public BurndownDataResponse getBurndownData(Long boardId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException("Quadro", boardId));

        List<Card> allCards = cardRepository.findAllByBoardId(boardId);

        int totalStoryPoints = allCards.stream()
                .mapToInt(Card::getStoryPoints)
                .sum();

        int remainingStoryPoints = allCards.stream()
                .filter(card -> card.getCompletedAt() == null)
                .mapToInt(Card::getStoryPoints)
                .sum();

        List<Card> completedCards = cardRepository.findCompletedCardsByBoardId(boardId);

        Map<String, Integer> completedPerDay = completedCards.stream()
                .collect(Collectors.groupingBy(
                        card -> card.getCompletedAt().toLocalDate().toString(),
                        LinkedHashMap::new,
                        Collectors.summingInt(Card::getStoryPoints)
                ));

        return BurndownDataResponse.builder()
                .boardId(board.getId())
                .title(board.getTitle())
                .startDate(board.getStartDate())
                .endDate(board.getEndDate())
                .durationDays(board.getDurationDays())
                .totalStoryPoints(totalStoryPoints)
                .remainingStoryPoints(remainingStoryPoints)
                .completedPerDay(completedPerDay)
                .build();
    }
}
