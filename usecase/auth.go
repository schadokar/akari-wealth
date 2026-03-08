package usecase

import (
	"context"
	"errors"

	"github.com/perfi/auth"
	"github.com/perfi/model"
	"golang.org/x/crypto/bcrypt"
)

func (u *UseCase) Register(ctx context.Context, username, password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	id, err := u.store.InsertUser(ctx, model.User{
		Username:     username,
		PasswordHash: string(hash),
	})
	if err != nil {
		return "", err
	}
	return auth.SignToken(id)
}

func (u *UseCase) Login(ctx context.Context, username, password string) (string, error) {
	user, err := u.store.GetUserByUsername(ctx, username)
	if err != nil {
		return "", err
	}
	if user == nil {
		return "", errors.New("invalid credentials")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", errors.New("invalid credentials")
	}
	return auth.SignToken(user.ID)
}
