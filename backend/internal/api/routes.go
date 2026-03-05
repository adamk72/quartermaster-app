package api

import "net/http"

func RegisterRoutes(mux *http.ServeMux) {
	// Public routes
	mux.HandleFunc("POST /api/v1/auth/login", handleLogin)

	// Protected routes - wrap with auth middleware
	auth := func(h http.HandlerFunc) http.Handler {
		return Auth(http.HandlerFunc(h))
	}

	mux.Handle("GET /api/v1/auth/me", auth(handleMe))

	// Characters
	mux.Handle("GET /api/v1/characters", auth(handleListCharacters))
	mux.Handle("GET /api/v1/characters/{id}", auth(handleGetCharacter))
	mux.Handle("POST /api/v1/characters", auth(handleCreateCharacter))
	mux.Handle("PUT /api/v1/characters/{id}", auth(handleUpdateCharacter))
	mux.Handle("DELETE /api/v1/characters/{id}", auth(handleDeleteCharacter))

	// Containers
	mux.Handle("GET /api/v1/containers", auth(handleListContainers))
	mux.Handle("GET /api/v1/containers/{id}", auth(handleGetContainer))
	mux.Handle("POST /api/v1/containers", auth(handleCreateContainer))
	mux.Handle("PUT /api/v1/containers/{id}", auth(handleUpdateContainer))
	mux.Handle("DELETE /api/v1/containers/{id}", auth(handleDeleteContainer))

	// Items
	mux.Handle("GET /api/v1/items", auth(handleListItems))
	mux.Handle("GET /api/v1/items/summary", auth(handleItemSummary))
	mux.Handle("GET /api/v1/items/{id}", auth(handleGetItem))
	mux.Handle("POST /api/v1/items", auth(handleCreateItem))
	mux.Handle("PUT /api/v1/items/{id}", auth(handleUpdateItem))
	mux.Handle("DELETE /api/v1/items/{id}", auth(handleDeleteItem))
	mux.Handle("POST /api/v1/items/{id}/sell", auth(handleSellItem))
	mux.Handle("POST /api/v1/items/{id}/identify", auth(handleIdentifyItem))

	// Coins
	mux.Handle("GET /api/v1/coins", auth(handleListCoins))
	mux.Handle("POST /api/v1/coins", auth(handleCreateCoin))
	mux.Handle("DELETE /api/v1/coins/{id}", auth(handleDeleteCoin))
	mux.Handle("GET /api/v1/coins/balance", auth(handleCoinBalance))

	// Critters
	mux.Handle("GET /api/v1/critters", auth(handleListCritters))
	mux.Handle("POST /api/v1/critters", auth(handleCreateCritter))
	mux.Handle("PUT /api/v1/critters/{id}", auth(handleUpdateCritter))
	mux.Handle("DELETE /api/v1/critters/{id}", auth(handleDeleteCritter))
	mux.Handle("POST /api/v1/critters/dismiss-all", auth(handleDismissAllCritters))

	// Sessions (journal)
	mux.Handle("GET /api/v1/sessions", auth(handleListSessions))
	mux.Handle("GET /api/v1/sessions/{id}", auth(handleGetSession))
	mux.Handle("POST /api/v1/sessions", auth(handleCreateSession))
	mux.Handle("PUT /api/v1/sessions/{id}", auth(handleUpdateSession))
	mux.Handle("DELETE /api/v1/sessions/{id}", auth(handleDeleteSession))
	mux.Handle("POST /api/v1/sessions/{id}/images", auth(handleUploadImage))

	// Skills
	mux.Handle("GET /api/v1/skills", auth(handleListSkills))
	mux.Handle("PUT /api/v1/skills/{character_id}", auth(handleUpdateSkills))

	// XP
	mux.Handle("GET /api/v1/xp", auth(handleListXP))
	mux.Handle("POST /api/v1/xp", auth(handleCreateXP))
	mux.Handle("PUT /api/v1/xp/{id}", auth(handleUpdateXP))
	mux.Handle("DELETE /api/v1/xp/{id}", auth(handleDeleteXP))
	mux.Handle("GET /api/v1/xp/totals", auth(handleXPTotals))

	// Quests
	mux.Handle("GET /api/v1/quests", auth(handleListQuests))
	mux.Handle("GET /api/v1/quests/{id}", auth(handleGetQuest))
	mux.Handle("POST /api/v1/quests", auth(handleCreateQuest))
	mux.Handle("PUT /api/v1/quests/{id}", auth(handleUpdateQuest))
	mux.Handle("DELETE /api/v1/quests/{id}", auth(handleDeleteQuest))

	// Watch
	mux.Handle("GET /api/v1/watch/schedules", auth(handleListWatchSchedules))
	mux.Handle("POST /api/v1/watch/schedules", auth(handleCreateWatchSchedule))
	mux.Handle("PUT /api/v1/watch/schedules/{id}", auth(handleUpdateWatchSchedule))
	mux.Handle("DELETE /api/v1/watch/schedules/{id}", auth(handleDeleteWatchSchedule))

	// Consumables
	mux.Handle("GET /api/v1/consumables/types", auth(handleListConsumableTypes))
	mux.Handle("POST /api/v1/consumables/types", auth(handleCreateConsumableType))
	mux.Handle("PUT /api/v1/consumables/types/{id}", auth(handleUpdateConsumableType))
	mux.Handle("DELETE /api/v1/consumables/types/{id}", auth(handleDeleteConsumableType))
	mux.Handle("GET /api/v1/consumables/ledger", auth(handleListConsumableLedger))
	mux.Handle("POST /api/v1/consumables/ledger", auth(handleCreateConsumableLedgerEntry))
	mux.Handle("DELETE /api/v1/consumables/ledger/{id}", auth(handleDeleteConsumableLedgerEntry))
	mux.Handle("GET /api/v1/consumables/balances", auth(handleConsumableBalances))
	mux.Handle("POST /api/v1/consumables/consume-day", auth(handleConsumeDay))

	// Changelog
	mux.Handle("GET /api/v1/changelog", auth(handleListChangelog))

	// Serve uploaded files
	mux.Handle("GET /uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(UploadsDir))))
}
