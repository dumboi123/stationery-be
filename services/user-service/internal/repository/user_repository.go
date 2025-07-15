package repository

import (
	"database/sql"
	"time"

	"user-service/internal/models"

	"github.com/google/uuid"
)

type UserRepository interface {
	Create(user *models.User) error
	GetByID(id string) (*models.User, error)
	GetByEmail(email string) (*models.User, error)
	GetByUsername(username string) (*models.User, error)
	Update(id string, updates map[string]interface{}) error
	Delete(id string) error
	CreateSession(session *models.UserSession) error
	GetSessionByRefreshToken(token string) (*models.UserSession, error)
	DeleteSession(sessionID string) error
}

type userRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(user *models.User) error {
	user.ID = uuid.New().String()
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	query := `
		INSERT INTO users (id, email, username, password_hash, role, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err := r.db.Exec(query, user.ID, user.Email, user.Username, user.Password, user.Role, user.IsActive, user.CreatedAt, user.UpdatedAt)
	return err
}

func (r *userRepository) GetByID(id string) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, username, password_hash, role, is_active, created_at, updated_at
		FROM users WHERE id = $1
	`

	err := r.db.QueryRow(query, id).Scan(
		&user.ID, &user.Email, &user.Username, &user.Password,
		&user.Role, &user.IsActive, &user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}

	return user, err
}

func (r *userRepository) GetByEmail(email string) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, username, password_hash, role, is_active, created_at, updated_at
		FROM users WHERE email = $1
	`

	err := r.db.QueryRow(query, email).Scan(
		&user.ID, &user.Email, &user.Username, &user.Password,
		&user.Role, &user.IsActive, &user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}

	return user, err
}

func (r *userRepository) GetByUsername(username string) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, username, password_hash, role, is_active, created_at, updated_at
		FROM users WHERE username = $1
	`

	err := r.db.QueryRow(query, username).Scan(
		&user.ID, &user.Email, &user.Username, &user.Password,
		&user.Role, &user.IsActive, &user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}

	return user, err
}

func (r *userRepository) Update(id string, updates map[string]interface{}) error {
	// Implementation for dynamic updates would go here
	// For simplicity, implementing specific update methods
	return nil
}

func (r *userRepository) Delete(id string) error {
	query := `UPDATE users SET is_active = false, updated_at = $1 WHERE id = $2`
	_, err := r.db.Exec(query, time.Now(), id)
	return err
}

func (r *userRepository) CreateSession(session *models.UserSession) error {
	session.ID = uuid.New().String()
	session.CreatedAt = time.Now()

	query := `
		INSERT INTO user_sessions (id, user_id, refresh_token, expires_at, created_at, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err := r.db.Exec(query, session.ID, session.UserID, session.RefreshToken,
		session.ExpiresAt, session.CreatedAt, session.IPAddress, session.UserAgent)
	return err
}

func (r *userRepository) GetSessionByRefreshToken(token string) (*models.UserSession, error) {
	session := &models.UserSession{}
	query := `
		SELECT id, user_id, refresh_token, expires_at, created_at, ip_address, user_agent
		FROM user_sessions WHERE refresh_token = $1 AND expires_at > NOW()
	`

	err := r.db.QueryRow(query, token).Scan(
		&session.ID, &session.UserID, &session.RefreshToken,
		&session.ExpiresAt, &session.CreatedAt, &session.IPAddress, &session.UserAgent,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}

	return session, err
}

func (r *userRepository) DeleteSession(sessionID string) error {
	query := `DELETE FROM user_sessions WHERE id = $1`
	_, err := r.db.Exec(query, sessionID)
	return err
}
