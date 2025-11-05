using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class NotificationRepository : INotificationRepository
    {
        private readonly AppDbContext _context;

        public NotificationRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Notification?> GetByIdAsync(int notificationId)
        {
            return await _context.Notifications
                .Include(n => n.Sender)
                .Include(n => n.Post)
                .FirstOrDefaultAsync(n => n.notification_id == notificationId);
        }

        public async Task<List<Notification>> GetByUserIdAsync(int userId, int skip = 0, int take = 20)
        {
            return await _context.Notifications
                .Include(n => n.Sender)
                .Include(n => n.Post)
                .Where(n => n.user_id == userId)
                .OrderByDescending(n => n.created_at)
                .Skip(skip)
                .Take(take)
                .ToListAsync();
        }

        public async Task<List<Notification>> GetUnreadByUserIdAsync(int userId)
        {
            return await _context.Notifications
                .Include(n => n.Sender)
                .Include(n => n.Post)
                .Where(n => n.user_id == userId && !n.is_read)
                .OrderByDescending(n => n.created_at)
                .ToListAsync();
        }

        public async Task<int> GetUnreadCountByUserIdAsync(int userId)
        {
            return await _context.Notifications
                .Where(n => n.user_id == userId && !n.is_read)
                .CountAsync();
        }

        public async Task<Notification> AddAsync(Notification notification)
        {
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();
            return notification;
        }

        public async Task MarkAsReadAsync(int notificationId)
        {
            var notification = await _context.Notifications.FindAsync(notificationId);
            if (notification != null)
            {
                notification.is_read = true;
                await _context.SaveChangesAsync();
            }
        }

        public async Task MarkAllAsReadAsync(int userId)
        {
            var notifications = await _context.Notifications
                .Where(n => n.user_id == userId && !n.is_read)
                .ToListAsync();

            foreach (var notification in notifications)
            {
                notification.is_read = true;
            }

            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Notification notification)
        {
            _context.Notifications.Remove(notification);
            await _context.SaveChangesAsync();
        }
    }
}
