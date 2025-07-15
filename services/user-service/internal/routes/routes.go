package routes

import (
	"user-service/internal/handlers"
	"user-service/internal/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine, userHandler *handlers.UserHandler, authMiddleware *middleware.AuthMiddleware) {
	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "user-service",
		})
	})

	// API v1 group
	v1 := router.Group("/api/v1")
	{
		// Public routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", userHandler.Register)
			auth.POST("/login", userHandler.Login)
			auth.POST("/refresh", userHandler.RefreshToken)
		}

		// Public user routes (for internal service communication)
		users := v1.Group("/users")
		{
			users.GET("/:id", userHandler.GetUserByID)
		}

		// Protected routes
		protected := v1.Group("/user")
		protected.Use(authMiddleware.RequireAuth())
		{
			protected.GET("/profile", userHandler.GetProfile)
			protected.PUT("/profile", userHandler.UpdateProfile)
			protected.DELETE("/account", userHandler.DeleteAccount)
		}
	}
}
