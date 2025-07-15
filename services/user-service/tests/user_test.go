package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"user-service/internal/config"
	"user-service/internal/handlers"
	"user-service/internal/middleware"
	"user-service/internal/models"
	"user-service/internal/repository"
	"user-service/internal/routes"
	"user-service/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockUserRepository is a mock implementation of UserRepository
type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) CreateUser(user *models.User) error {
	args := m.Called(user)
	return args.Error(0)
}

func (m *MockUserRepository) GetUserByEmail(email string) (*models.User, error) {
	args := m.Called(email)
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserRepository) GetUserByID(id string) (*models.User, error) {
	args := m.Called(id)
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserRepository) UpdateUser(user *models.User) error {
	args := m.Called(user)
	return args.Error(0)
}

func (m *MockUserRepository) DeleteUser(id string) error {
	args := m.Called(id)
	return args.Error(0)
}

func (m *MockUserRepository) SaveRefreshToken(userID, tokenHash string, expiresAt int64) error {
	args := m.Called(userID, tokenHash, expiresAt)
	return args.Error(0)
}

func (m *MockUserRepository) GetRefreshToken(tokenHash string) (*models.RefreshToken, error) {
	args := m.Called(tokenHash)
	return args.Get(0).(*models.RefreshToken), args.Error(1)
}

func (m *MockUserRepository) DeleteRefreshToken(tokenHash string) error {
	args := m.Called(tokenHash)
	return args.Error(0)
}

func setupTestRouter() (*gin.Engine, *MockUserRepository) {
	gin.SetMode(gin.TestMode)
	
	// Create mock repository
	mockRepo := &MockUserRepository{}
	
	// Create config
	cfg := &config.Config{
		JWT: config.JWTConfig{
			SecretKey:            "test-secret-key",
			AccessTokenDuration:  15,
			RefreshTokenDuration: 24,
		},
	}
	
	// Create services
	userService := services.NewUserService(mockRepo, cfg)
	userHandler := handlers.NewUserHandler(userService)
	authMiddleware := middleware.NewAuthMiddleware(cfg.JWT.SecretKey)
	
	// Setup router
	router := gin.New()
	routes.SetupRoutes(router, userHandler, authMiddleware)
	
	return router, mockRepo
}

func TestUserRegistration(t *testing.T) {
	router, mockRepo := setupTestRouter()
	
	// Test case: Successful registration
	t.Run("Successful Registration", func(t *testing.T) {
		// Setup mock expectations
		mockRepo.On("GetUserByEmail", "test@example.com").Return((*models.User)(nil), repository.ErrUserNotFound)
		mockRepo.On("CreateUser", mock.AnythingOfType("*models.User")).Return(nil)
		
		// Create request payload
		payload := models.CreateUserRequest{
			Email:     "test@example.com",
			Password:  "password123",
			FirstName: "Test",
			LastName:  "User",
			Phone:     "+1234567890",
		}
		
		jsonPayload, _ := json.Marshal(payload)
		
		// Create request
		req, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		
		// Perform request
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		
		// Assertions
		assert.Equal(t, http.StatusCreated, w.Code)
		
		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		
		assert.Contains(t, response, "data")
		assert.Contains(t, response, "meta")
		
		mockRepo.AssertExpectations(t)
	})
	
	// Test case: Email already exists
	t.Run("Email Already Exists", func(t *testing.T) {
		// Setup mock expectations
		existingUser := &models.User{
			ID:    "existing-user-id",
			Email: "existing@example.com",
		}
		mockRepo.On("GetUserByEmail", "existing@example.com").Return(existingUser, nil)
		
		// Create request payload
		payload := models.CreateUserRequest{
			Email:     "existing@example.com",
			Password:  "password123",
			FirstName: "Test",
			LastName:  "User",
		}
		
		jsonPayload, _ := json.Marshal(payload)
		
		// Create request
		req, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		
		// Perform request
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		
		// Assertions
		assert.Equal(t, http.StatusBadRequest, w.Code)
		
		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		
		assert.Contains(t, response, "error")
		
		mockRepo.AssertExpectations(t)
	})
}

func TestUserLogin(t *testing.T) {
	router, mockRepo := setupTestRouter()
	
	// Test case: Successful login
	t.Run("Successful Login", func(t *testing.T) {
		// Setup mock user with hashed password
		hashedPassword := "$2a$10$N9qo8uLOickgx2ZMRZoMye1Jrq/zAG6Q/DKOJcGdFGWBDJpE1Y2.2" // "password123"
		user := &models.User{
			ID:           "user-id",
			Email:        "test@example.com",
			PasswordHash: hashedPassword,
			FirstName:    "Test",
			LastName:     "User",
			IsActive:     true,
		}
		
		// Setup mock expectations
		mockRepo.On("GetUserByEmail", "test@example.com").Return(user, nil)
		mockRepo.On("SaveRefreshToken", "user-id", mock.AnythingOfType("string"), mock.AnythingOfType("int64")).Return(nil)
		
		// Create request payload
		payload := models.LoginRequest{
			Email:    "test@example.com",
			Password: "password123",
		}
		
		jsonPayload, _ := json.Marshal(payload)
		
		// Create request
		req, _ := http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		
		// Perform request
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		
		// Assertions
		assert.Equal(t, http.StatusOK, w.Code)
		
		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		
		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})
		assert.Contains(t, data, "access_token")
		assert.Contains(t, data, "refresh_token")
		assert.Contains(t, data, "user")
		
		mockRepo.AssertExpectations(t)
	})
	
	// Test case: Invalid credentials
	t.Run("Invalid Credentials", func(t *testing.T) {
		// Setup mock expectations
		mockRepo.On("GetUserByEmail", "wrong@example.com").Return((*models.User)(nil), repository.ErrUserNotFound)
		
		// Create request payload
		payload := models.LoginRequest{
			Email:    "wrong@example.com",
			Password: "wrongpassword",
		}
		
		jsonPayload, _ := json.Marshal(payload)
		
		// Create request
		req, _ := http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")
		
		// Perform request
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		
		// Assertions
		assert.Equal(t, http.StatusUnauthorized, w.Code)
		
		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		
		assert.Contains(t, response, "error")
		
		mockRepo.AssertExpectations(t)
	})
}

func TestHealthCheck(t *testing.T) {
	router, _ := setupTestRouter()
	
	// Create request
	req, _ := http.NewRequest("GET", "/health", nil)
	
	// Perform request
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	
	assert.Equal(t, "ok", response["status"])
	assert.Equal(t, "user-service", response["service"])
}
