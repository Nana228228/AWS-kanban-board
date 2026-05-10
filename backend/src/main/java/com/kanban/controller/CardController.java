package com.kanban.controller;

import com.kanban.dto.request.CardCreateRequest;
import com.kanban.dto.request.CardMoveRequest;
import com.kanban.dto.request.ReorderRequest;
import com.kanban.dto.response.CardResponse;
import com.kanban.service.CardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class CardController {

    private final CardService cardService;

    @PostMapping("/columns/{columnId}/cards")
    public ResponseEntity<CardResponse> create(@PathVariable Long columnId,
                                               @Valid @RequestBody CardCreateRequest request) {
        CardResponse response = cardService.create(columnId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/cards/{id}")
    public ResponseEntity<CardResponse> update(@PathVariable Long id,
                                               @Valid @RequestBody CardCreateRequest request) {
        return ResponseEntity.ok(cardService.update(id, request));
    }

    @PatchMapping("/cards/{id}/move")
    public ResponseEntity<CardResponse> move(@PathVariable Long id,
                                             @Valid @RequestBody CardMoveRequest request) {
        return ResponseEntity.ok(cardService.move(id, request));
    }

    @PutMapping("/columns/{columnId}/cards/reorder")
    public ResponseEntity<List<CardResponse>> reorder(@PathVariable Long columnId,
                                                      @Valid @RequestBody ReorderRequest request) {
        return ResponseEntity.ok(cardService.reorder(columnId, request));
    }

    @DeleteMapping("/cards/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        cardService.delete(id);
        return ResponseEntity.ok().build();
    }
}
