package com.kanban.service;

import com.kanban.dto.request.CardCreateRequest;
import com.kanban.dto.request.CardMoveRequest;
import com.kanban.dto.request.ReorderRequest;
import com.kanban.dto.response.CardResponse;
import com.kanban.exception.ResourceNotFoundException;
import com.kanban.exception.ValidationException;
import com.kanban.model.Card;
import com.kanban.model.KanbanColumn;
import com.kanban.repository.CardRepository;
import com.kanban.repository.ColumnRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class CardService {

    private final CardRepository cardRepository;
    private final ColumnRepository columnRepository;

    public CardResponse create(Long columnId, CardCreateRequest request) {
        KanbanColumn column = columnRepository.findById(columnId)
                .orElseThrow(() -> new ResourceNotFoundException("Coluna", columnId));

        String trimmedTitle = validateAndTrimTitle(request.getTitle());
        validateDescription(request.getDescription());

        int storyPoints = request.getStoryPoints() != null ? request.getStoryPoints() : 0;
        validateStoryPoints(storyPoints);

        int nextPosition = cardRepository.findByColumnIdOrderByPositionAsc(columnId).size();

        Card card = new Card();
        card.setColumn(column);
        card.setTitle(trimmedTitle);
        card.setDescription(request.getDescription());
        card.setStoryPoints(storyPoints);
        card.setPosition(nextPosition);

        if (column.isDoneColumn()) {
            card.setCompletedAt(LocalDateTime.now());
        } else {
            card.setCompletedAt(null);
        }

        Card saved = cardRepository.save(card);
        return mapToResponse(saved);
    }

    public CardResponse update(Long id, CardCreateRequest request) {
        Card card = cardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cartão", id));

        String trimmedTitle = validateAndTrimTitle(request.getTitle());
        validateDescription(request.getDescription());

        if (request.getStoryPoints() != null) {
            validateStoryPoints(request.getStoryPoints());
            card.setStoryPoints(request.getStoryPoints());
        }

        card.setTitle(trimmedTitle);
        card.setDescription(request.getDescription());

        Card saved = cardRepository.save(card);
        return mapToResponse(saved);
    }

    public CardResponse move(Long cardId, CardMoveRequest request) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Cartão", cardId));

        KanbanColumn targetColumn = columnRepository.findById(request.getTargetColumnId())
                .orElseThrow(() -> new ValidationException("Coluna destino inválida"));

        card.setColumn(targetColumn);

        if (targetColumn.isDoneColumn()) {
            card.setCompletedAt(LocalDateTime.now());
        } else {
            card.setCompletedAt(null);
        }

        if (request.getPosition() != null) {
            card.setPosition(request.getPosition());
        } else {
            int endPosition = cardRepository.findByColumnIdOrderByPositionAsc(targetColumn.getId()).size();
            card.setPosition(endPosition);
        }

        Card saved = cardRepository.save(card);
        return mapToResponse(saved);
    }

    public List<CardResponse> reorder(Long columnId, ReorderRequest request) {
        columnRepository.findById(columnId)
                .orElseThrow(() -> new ResourceNotFoundException("Coluna", columnId));

        List<Long> orderedIds = request.getOrderedIds();

        for (int i = 0; i < orderedIds.size(); i++) {
            Long cardId = orderedIds.get(i);
            Card card = cardRepository.findById(cardId)
                    .orElseThrow(() -> new ResourceNotFoundException("Cartão", cardId));
            card.setPosition(i);
            cardRepository.save(card);
        }

        return cardRepository.findByColumnIdOrderByPositionAsc(columnId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public void delete(Long id) {
        Card card = cardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cartão", id));

        cardRepository.delete(card);
    }

    private String validateAndTrimTitle(String title) {
        if (title == null || title.trim().isEmpty()) {
            throw new ValidationException("O título do cartão é obrigatório");
        }
        String trimmed = title.trim();
        if (trimmed.length() > 200) {
            throw new ValidationException("O título do cartão deve ter no máximo 200 caracteres");
        }
        return trimmed;
    }

    private void validateDescription(String description) {
        if (description != null && description.length() > 2000) {
            throw new ValidationException("A descrição do cartão deve ter no máximo 2000 caracteres");
        }
    }

    private void validateStoryPoints(int storyPoints) {
        if (storyPoints < 0) {
            throw new ValidationException("Os story points devem ser maior ou igual a 0");
        }
    }

    private CardResponse mapToResponse(Card card) {
        return CardResponse.builder()
                .id(card.getId())
                .columnId(card.getColumn().getId())
                .title(card.getTitle())
                .description(card.getDescription())
                .storyPoints(card.getStoryPoints())
                .position(card.getPosition())
                .completedAt(card.getCompletedAt())
                .createdAt(card.getCreatedAt())
                .updatedAt(card.getUpdatedAt())
                .build();
    }
}
