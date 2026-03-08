package usecase

import (
	"context"
	"math"
	"time"

	"github.com/perfi/model"
)

func (u *UseCase) CreateGoal(ctx context.Context, req model.CreateGoalRequest) (int64, error) {
	if err := validateMappingWeights(req.Mappings); err != nil {
		return 0, err
	}

	goalID, err := u.store.InsertGoal(ctx, model.Goal{
		Name:         req.Name,
		TargetAmount: req.TargetAmount,
		Status:       model.GoalStatusActive,
		Priority:     req.Priority,
		TargetDate:   req.TargetDate,
		Notes:        req.Notes,
	})
	if err != nil {
		return 0, err
	}

	for _, m := range req.Mappings {
		_, err := u.store.InsertGoalMapping(ctx, model.GoalMapping{
			GoalID:           goalID,
			AssetTable:       m.AssetTable,
			AssetType:        m.AssetType,
			AssetID:          m.AssetID,
			AllocationWeight: m.AllocationWeight,
		})
		if err != nil {
			return 0, err
		}
	}

	return goalID, nil
}

func (u *UseCase) GetGoalByID(ctx context.Context, id int64) (*model.GoalResponse, error) {
	g, err := u.store.GetGoalByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if g == nil {
		return nil, nil
	}
	mappings, err := u.store.GetGoalMappingsByGoalID(ctx, id)
	if err != nil {
		return nil, err
	}
	return toGoalResponse(*g, mappings), nil
}

func (u *UseCase) GetGoals(ctx context.Context) ([]model.GoalResponse, error) {
	goals, err := u.store.GetGoals(ctx)
	if err != nil {
		return nil, err
	}
	resp := make([]model.GoalResponse, 0, len(goals))
	for _, g := range goals {
		mappings, err := u.store.GetGoalMappingsByGoalID(ctx, g.ID)
		if err != nil {
			return nil, err
		}
		resp = append(resp, *toGoalResponse(g, mappings))
	}
	return resp, nil
}

func (u *UseCase) UpdateGoal(ctx context.Context, id int64, req model.UpdateGoalRequest) error {
	g, err := u.store.GetGoalByID(ctx, id)
	if err != nil {
		return err
	}
	if g == nil {
		return model.ErrNotFound
	}
	if req.Name != nil {
		g.Name = *req.Name
	}
	if req.TargetAmount != nil {
		g.TargetAmount = *req.TargetAmount
	}
	if req.Status != nil {
		g.Status = *req.Status
	}
	if req.Notes != nil {
		g.Notes = req.Notes
	}
	if req.Priority != nil {
		g.Priority = *req.Priority
	}
	if req.TargetDate != nil {
		g.TargetDate = req.TargetDate
	}
	return u.store.UpdateGoal(ctx, id, *g)
}

func (u *UseCase) DeleteGoal(ctx context.Context, id int64) error {
	return u.store.DeleteGoal(ctx, id)
}

func (u *UseCase) UpdateGoalMappings(ctx context.Context, goalID int64, inputs []model.GoalMappingInput) error {
	if err := validateMappingWeights(inputs); err != nil {
		return err
	}
	mappings := make([]model.GoalMapping, len(inputs))
	for i, m := range inputs {
		mappings[i] = model.GoalMapping{
			GoalID:           goalID,
			AssetTable:       m.AssetTable,
			AssetType:        m.AssetType,
			AssetID:          m.AssetID,
			AllocationWeight: m.AllocationWeight,
		}
	}
	return u.store.ReplaceGoalMappings(ctx, goalID, mappings)
}

// validateMappingWeights returns an error if mapping weights don't sum to 1.0 (empty mappings are allowed).
func validateMappingWeights(mappings []model.GoalMappingInput) error {
	if len(mappings) == 0 {
		return nil
	}
	var total float64
	for _, m := range mappings {
		total += m.AllocationWeight
	}
	if math.Abs(total-1.0) > 1e-9 {
		return model.ErrWeightNotHundred
	}
	return nil
}

func (u *UseCase) GetGoalAnalytics(ctx context.Context) ([]model.GoalAnalyticsEntry, error) {
	goals, err := u.store.GetGoals(ctx)
	if err != nil {
		return nil, err
	}

	latestAmounts, err := u.store.GetGoalLatestAmounts(ctx)
	if err != nil {
		return nil, err
	}

	monthlyHistory, err := u.store.GetGoalMonthlyHistory(ctx)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	entries := make([]model.GoalAnalyticsEntry, 0, len(goals))
	for _, g := range goals {
		entry := model.GoalAnalyticsEntry{
			GoalID:         g.ID,
			AssetBreakdown: make(map[string]float64),
			MonthlyHistory: monthlyHistory[g.ID],
			GoalAgeMonths:  int(now.Sub(g.CreatedAt).Hours() / 24 / 30),
		}
		if entry.MonthlyHistory == nil {
			entry.MonthlyHistory = []model.GoalMonthPoint{}
		}

		// Aggregate current and invested across all asset classes
		if byClass, ok := latestAmounts[g.ID]; ok {
			for class, amounts := range byClass {
				entry.CurrentAmount += amounts[0]
				entry.InvestedAmount += amounts[1]
				entry.AssetBreakdown[class] = amounts[0]
			}
		}
		entry.UnrealizedGain = entry.CurrentAmount - entry.InvestedAmount
		if entry.InvestedAmount > 0 {
			entry.ReturnPct = (entry.UnrealizedGain / entry.InvestedAmount) * 100
		}

		// Estimate months to completion from last 3 months velocity
		history := entry.MonthlyHistory
		if len(history) >= 2 {
			n := len(history)
			lookback := 3
			if n < lookback+1 {
				lookback = n - 1
			}
			delta := history[n-1].Current - history[n-1-lookback].Current
			monthlyVelocity := delta / float64(lookback)
			remaining := g.TargetAmount - entry.CurrentAmount
			if monthlyVelocity > 0 && remaining > 0 {
				est := int(math.Ceil(remaining / monthlyVelocity))
				entry.EstMonthsLeft = &est
			} else if remaining <= 0 {
				zero := 0
				entry.EstMonthsLeft = &zero
			}
		}

		entries = append(entries, entry)
	}
	return entries, nil
}

func toGoalResponse(g model.Goal, mappings []model.GoalMapping) *model.GoalResponse {
	if mappings == nil {
		mappings = []model.GoalMapping{}
	}
	return &model.GoalResponse{
		ID:           g.ID,
		Name:         g.Name,
		TargetAmount: g.TargetAmount,
		Status:       g.Status,
		Priority:     g.Priority,
		TargetDate:   g.TargetDate,
		Notes:        g.Notes,
		Mappings:     mappings,
		CreatedAt:    g.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:    g.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}
}
