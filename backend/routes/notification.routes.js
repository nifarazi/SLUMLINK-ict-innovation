// backend/routes/notification.routes.js
import express from 'express';
import { notificationController } from '../controllers/notification.controller.js';

const router = express.Router();

// Get all notifications for a slum dweller
router.get('/notifications/:slumCode', notificationController.getNotifications);

// Get unread notification count for a slum dweller
router.get('/notifications/:slumCode/unread-count', notificationController.getUnreadCount);

// Mark single notification as read
router.put('/notifications/:notificationId/read', notificationController.markAsRead);

// Mark all notifications as read for a slum dweller
router.put('/notifications/:slumCode/read-all', notificationController.markAllAsRead);

export default router;