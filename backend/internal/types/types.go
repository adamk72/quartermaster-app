package types

import "time"

type Character struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	PlayerName string    `json:"player_name"`
	Class      string    `json:"class"`
	Level      int       `json:"level"`
	Race       string    `json:"race"`
	AC         int       `json:"ac"`
	HPMax      int       `json:"hp_max"`
	Icon       string    `json:"icon"`
	Notes      string    `json:"notes"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type Container struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Type        string    `json:"type"`
	CharacterID *string   `json:"character_id"`
	MountID     *string   `json:"mount_id"`
	WeightLimit *float64  `json:"weight_limit"`
	Location    string    `json:"location"`
	Notes       string    `json:"notes"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Version     int       `json:"version"`
	Items       []Item    `json:"items,omitempty"`
	TotalWeight float64   `json:"total_weight,omitempty"`
}

type Label struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Color     string    `json:"color"`
	TextColor string    `json:"text_color"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Item struct {
	ID               int       `json:"id"`
	Name             string    `json:"name"`
	Quantity         int       `json:"quantity"`
	GameDate         string    `json:"game_date"`
	Category         string    `json:"category"`
	ContainerID      *string   `json:"container_id"`
	Sold             bool      `json:"sold"`
	UnitWeightLbs    *float64  `json:"unit_weight_lbs"`
	UnitValueGP      *float64  `json:"unit_value_gp"`
	WeightOverride   *float64  `json:"weight_override"`
	AddedToDnDBeyond bool      `json:"added_to_dndbeyond"`
	Identified       bool      `json:"identified"`
	AttunedTo        *string   `json:"attuned_to"`
	Singular         string    `json:"singular"`
	Notes            string    `json:"notes"`
	SortOrder        int       `json:"sort_order"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
	Version          int       `json:"version"`
	Labels           []Label   `json:"labels"`
	LabelIDs         []string  `json:"label_ids,omitempty"`
	BuyPriceGP       *float64  `json:"buy_price_gp,omitempty"`
}

type CoinLedgerEntry struct {
	ID          int       `json:"id"`
	GameDate    string    `json:"game_date"`
	Description string    `json:"description"`
	CP          int       `json:"cp"`
	SP          int       `json:"sp"`
	EP          int       `json:"ep"`
	GP          int       `json:"gp"`
	PP          int       `json:"pp"`
	Direction   string    `json:"direction"`
	ItemID      *int      `json:"item_id"`
	Notes       string    `json:"notes"`
	CreatedAt   time.Time `json:"created_at"`
}

type CoinBalance struct {
	CP      int     `json:"cp"`
	SP      int     `json:"sp"`
	EP      int     `json:"ep"`
	GP      int     `json:"gp"`
	PP      int     `json:"pp"`
	TotalGP float64 `json:"total_gp"`
}

type Mount struct {
	ID               string    `json:"id"`
	Name             string    `json:"name"`
	CarryingCapacity *float64  `json:"carrying_capacity"`
	Notes            string    `json:"notes"`
	Active           bool      `json:"active"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type Critter struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	CharacterID string    `json:"character_id"`
	HPCurrent   int       `json:"hp_current"`
	HPMax       int       `json:"hp_max"`
	AC          int       `json:"ac"`
	Notes       string    `json:"notes"`
	Active      bool      `json:"active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Session struct {
	ID        int            `json:"id"`
	GameDate  string         `json:"game_date"`
	Title     string         `json:"title"`
	BodyJSON  string         `json:"body_json"`
	BodyHTML  string         `json:"body_html"`
	XPGained  int            `json:"xp_gained"`
	CreatedBy *string        `json:"created_by"`
	Images    []SessionImage `json:"images,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}

type SessionImage struct {
	ID        int    `json:"id"`
	SessionID int    `json:"session_id"`
	Filename  string `json:"filename"`
	Caption   string `json:"caption"`
	SortOrder int    `json:"sort_order"`
}

type Skill struct {
	ID          int    `json:"id"`
	CharacterID string `json:"character_id"`
	SkillName   string `json:"skill_name"`
	Bonus       int    `json:"bonus"`
	Proficient  bool   `json:"proficient"`
	Expertise   bool   `json:"expertise"`
}

type SkillReference struct {
	SkillName     string `json:"skill_name"`
	NumProficient int    `json:"num_proficient"`
	Modifier      string `json:"modifier"`
	BestCombo     string `json:"best_combo"`
}

type XPEntry struct {
	ID          int            `json:"id"`
	SessionID   *int           `json:"session_id"`
	GameDate    string         `json:"game_date"`
	XPAmount    int            `json:"xp_amount"`
	Description string         `json:"description"`
	Attendance  []XPAttendance `json:"attendance,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
}

type XPAttendance struct {
	ID          int    `json:"id"`
	XPEntryID   int    `json:"xp_entry_id"`
	CharacterID string `json:"character_id"`
	Present     bool   `json:"present"`
}

type Quest struct {
	ID                int       `json:"id"`
	Title             string    `json:"title"`
	Description       string    `json:"description"`
	Status            string    `json:"status"`
	GameDateAdded     string    `json:"game_date_added"`
	GameDateCompleted string    `json:"game_date_completed"`
	Notes             string    `json:"notes"`
	SortOrder         int       `json:"sort_order"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type WatchSchedule struct {
	ID        int         `json:"id"`
	Name      string      `json:"name"`
	Active    bool        `json:"active"`
	Slots     []WatchSlot `json:"slots,omitempty"`
	CreatedAt time.Time   `json:"created_at"`
}

type WatchSlot struct {
	ID          int    `json:"id"`
	ScheduleID  int    `json:"schedule_id"`
	WatchNumber int    `json:"watch_number"`
	CharacterID string `json:"character_id"`
	SortOrder   int    `json:"sort_order"`
}

type ConsumableType struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	Unit            string  `json:"unit"`
	PerPersonPerDay float64 `json:"per_person_per_day"`
	SortOrder       int     `json:"sort_order"`
}

type ConsumableLedgerEntry struct {
	ID               int       `json:"id"`
	ConsumableTypeID string    `json:"consumable_type_id"`
	Quantity         float64   `json:"quantity"`
	Direction        string    `json:"direction"`
	GameDate         string    `json:"game_date"`
	Description      string    `json:"description"`
	HeadCount        *int      `json:"head_count"`
	Notes            string    `json:"notes"`
	CreatedAt        time.Time `json:"created_at"`
}

type ConsumableBalance struct {
	ConsumableTypeID string  `json:"consumable_type_id"`
	Name             string  `json:"name"`
	Unit             string  `json:"unit"`
	PerPersonPerDay  float64 `json:"per_person_per_day"`
	Balance          float64 `json:"balance"`
	DaysRemaining    float64 `json:"days_remaining"`
}

type ConsumeDayRequest struct {
	GameDate  string `json:"game_date"`
	HeadCount int    `json:"head_count"`
	Notes     string `json:"notes"`
}

type Setting struct {
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
}

type User struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	CharacterID  *string   `json:"character_id"`
	SessionToken string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

type ChangelogEntry struct {
	ID        int       `json:"id"`
	UserID    *string   `json:"user_id"`
	TableName string    `json:"table_name"`
	RecordID  string    `json:"record_id"`
	Action    string    `json:"action"`
	DiffJSON  string    `json:"diff_json"`
	CreatedAt time.Time `json:"created_at"`
}

type ItemSummary struct {
	PartyCoinGP float64 `json:"party_coin_gp"`
	NetWorthGP  float64 `json:"net_worth_gp"`
	TotalWeight float64 `json:"total_weight"`
	ItemCount   int     `json:"item_count"`
}

type ActiveUser struct {
	ID            string  `json:"id"`
	Username      string  `json:"username"`
	CharacterID   *string `json:"character_id"`
	CharacterName string  `json:"character_name"`
	Icon          string  `json:"icon"`
}

type LoginRequest struct {
	Username    string  `json:"username"`
	InviteCode  string  `json:"invite_code"`
	CharacterID *string `json:"character_id"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}
