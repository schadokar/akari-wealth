package usecase

import (
	"fmt"

	"github.com/perfi/model"
)

func errNotFound(entity string) error {
	return fmt.Errorf("%s not found: %w", entity, model.ErrNotFound)
}

func errValidation(msg string) error {
	return fmt.Errorf("%s: %w", msg, model.ErrValidation)
}
