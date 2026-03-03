package usecase

import "fmt"

func errNotFound(entity string) error {
	return fmt.Errorf("%s not found", entity)
}
