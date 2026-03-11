# Inline Editing for Container and Labels Columns

## Scope

Two inventory table columns get inline editing: **Container** (single-select) and **Labels** (multi-select). All other fields remain in the existing Edit modal.

## Container Cell

- **Normal state**: Shows container display name with subtle dashed underline and tiny ▼ caret on hover.
- **Click**: Opens a dropdown positioned below the cell listing all containers. Current container shown with ✓ checkmark.
- **Select**: Saves immediately via `PUT /api/v1/items/{id}` with updated `container_id`. Dropdown closes.
- **Click outside**: Closes without saving.

## Labels Cell

- **Normal state**: Shows colored label tags. Pointer cursor on hover.
- **Click**: Opens a checklist dropdown with all available labels. Currently assigned labels are pre-checked.
- **Toggle**: Click checkboxes to add/remove labels.
- **Click outside**: Saves changes (sends updated `label_ids` via `PUT /api/v1/items/{id}`) and closes. If no changes were made, no API call.

## Concurrency

- Uses existing `version` field for optimistic locking (already in the PUT endpoint).
- On 409 Conflict: show toast "This item was just updated by someone else" and refetch the items list.
- No row-level locking or pessimistic locks needed.

## Discoverability

- Container: dashed underline + ▼ caret visible on hover.
- Labels: pointer cursor on hover.
- Both: subtle background highlight on hover to indicate clickability.

## Components

- `InlineContainerSelect` — dropdown for container assignment, positioned relative to the cell.
- `InlineLabelSelect` — multi-select checklist for labels, positioned relative to the cell.
- Both use a shared click-outside handler to close/save.

## API

No backend changes needed. The existing `PUT /api/v1/items/{id}` endpoint accepts partial updates and handles optimistic locking via `version`.
