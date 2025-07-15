package main

import (
	"log"
	"os"

	"user-service/internal/handlers"
	"user-service/internal/middleware"
	"user-service/internal/repository"
	"user-service/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		logrus.Warn("No .env file found")
	}

	// Initialize database connection
	db, err := repository.NewPostgresConnection()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)

	// Initialize services
	userService := services.NewUserService(userRepo)

	// Initialize handlers
	userHandler := handlers.NewUserHandler(userService)

	// Setup Gin router
	router := gin.Default()

	// Add middleware
	router.Use(middleware.CORSMiddleware())
	router.Use(middleware.LoggingMiddleware())
	router.Use(middleware.RecoveryMiddleware())

	// Health check endpoint
	router.GET("/health", handlers.HealthCheck)
	router.GET("/metrics", handlers.MetricsHandler)

	// API routes
	v1 := router.Group("/api/v1")
	{
		// Public routes
		v1.POST("/auth/register", userHandler.Register)
		v1.POST("/auth/login", userHandler.Login)
		v1.POST("/auth/refresh", userHandler.RefreshToken)

		// Protected routes
		protected := v1.Group("/")
		protected.Use(middleware.JWTAuthMiddleware())
		{
			protected.GET("/users/profile", userHandler.GetProfile)
			protected.PUT("/users/profile", userHandler.UpdateProfile)
			protected.DELETE("/users/profile", userHandler.DeleteAccount)
			protected.GET("/users/:id", userHandler.GetUserByID)
		}
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8001"
	}

	logrus.Infof("User Service starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
