// backend/controllers/notification.controller.js
import pool from '../db.js';

export const notificationController = {
  // Get all notifications for a slum dweller with unread count
  async getNotifications(req, res) {
    try {
      const { slumCode } = req.params;
      
      // Get notifications ordered by creation date (newest first)
      const [notifications] = await pool.execute(`
        SELECT 
          n.notification_id,
          n.campaign_id,
          n.org_id,
          n.type,
          n.title,
          n.message,
          n.is_read,
          n.created_at,
          COALESCE(o.org_name, 'Unknown Organization') as org_name
        FROM notifications n
        LEFT JOIN organizations o ON n.org_id = o.org_id
        WHERE n.slum_code = ?
        ORDER BY n.created_at DESC
      `, [slumCode]);

      // Get unread count
      const [unreadCount] = await pool.execute(`
        SELECT COUNT(*) as unread_count
        FROM notifications 
        WHERE slum_code = ? AND is_read = 0
      `, [slumCode]);

      res.json({
        success: true,
        notifications,
        unreadCount: unreadCount[0].unread_count
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching notifications',
        error: error.message 
      });
    }
  },

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      
      const [result] = await pool.execute(`
        UPDATE notifications 
        SET is_read = 1 
        WHERE notification_id = ?
      `, [notificationId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Notification not found' 
        });
      }

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error updating notification',
        error: error.message 
      });
    }
  },

  // Mark all notifications as read for a slum dweller
  async markAllAsRead(req, res) {
    try {
      const { slumCode } = req.params;
      
      await pool.execute(`
        UPDATE notifications 
        SET is_read = 1 
        WHERE slum_code = ? AND is_read = 0
      `, [slumCode]);

      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error updating notifications',
        error: error.message 
      });
    }
  },

  // Get unread notification count
  async getUnreadCount(req, res) {
    try {
      const { slumCode } = req.params;
      
      const [result] = await pool.execute(`
        SELECT COUNT(*) as unread_count
        FROM notifications 
        WHERE slum_code = ? AND is_read = 0
      `, [slumCode]);

      res.json({
        success: true,
        unreadCount: result[0].unread_count
      });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching unread count',
        error: error.message 
      });
    }
  }
};