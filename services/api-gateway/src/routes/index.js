const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('../config');

const router = express.Router();

// User Service Routes
router.use('/users', createProxyMiddleware({
  target: config.services.user,
  changeOrigin: true,
  pathRewrite: {
    '^/api/users': '/api/v1/users'
  }
}));

// Product Service Routes
router.use('/products', createProxyMiddleware({
  target: config.services.product,
  changeOrigin: true,
  pathRewrite: {
    '^/api/products': '/api/v1/products'
  }
}));

// Order Service Routes
router.use('/orders', createProxyMiddleware({
  target: config.services.order,
  changeOrigin: true,
  pathRewrite: {
    '^/api/orders': '/api/v1/orders'
  }
}));

// Payment Service Routes
router.use('/payments', createProxyMiddleware({
  target: config.services.payment,
  changeOrigin: true,
  pathRewrite: {
    '^/api/payments': '/api/v1/payments'
  }
}));

// Notification Service Routes
router.use('/notifications', createProxyMiddleware({
  target: config.services.notification,
  changeOrigin: true,
  pathRewrite: {
    '^/api/notifications': '/api/v1/notifications'
  }
}));

// Analytics Service Routes
router.use('/analytics', createProxyMiddleware({
  target: config.services.analytics,
  changeOrigin: true,
  pathRewrite: {
    '^/api/analytics': '/api/v1/analytics'
  }
}));

module.exports = router;
