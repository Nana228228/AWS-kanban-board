package com.kanban.controller;

import com.kanban.dto.request.ColumnCreateRequest;
import com.kanban.dto.request.ReorderRequest;
import com.kanban.dto.response.ColumnResponse;
import com.kanban.service.ColumnService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ColumnController {

    private final ColumnService columnService;

    @PostMapping("/boards/{boardId}/columns")
    public ResponseEntity<ColumnResponse> create(@PathVariable Long boardId,
                                                 @Valid @RequestBody ColumnCreateRequest request) {
        ColumnResponse response = columnService.create(boardId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/columns/{id}")
    public ResponseEntity<ColumnResponse> updateTitle(@PathVariable Long id,
                                                      @Valid @RequestBody ColumnCreateRequest request) {
        return ResponseEntity.ok(columnService.updateTitle(id, request));
    }

    @PutMapping("/boards/{boardId}/columns/reorder")
    public ResponseEntity<List<ColumnResponse>> reorder(@PathVariable Long boardId,
                                                        @Valid @RequestBody ReorderRequest request) {
        return ResponseEntity.ok(columnService.reorder(boardId, request));
    }

    @DeleteMapping("/columns/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        columnService.delete(id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/columns/{id}/done")
    public ResponseEntity<ColumnResponse> markAsDoneColumn(@PathVariable Long id) {
        return ResponseEntity.ok(columnService.markAsDoneColumn(id));
    }
}
