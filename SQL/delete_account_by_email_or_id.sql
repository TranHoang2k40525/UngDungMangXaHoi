-- Script: Xóa account và các dữ liệu liên quan (DEV/TEST only)
-- Sử dụng cẩn thận: luôn backup DB trước khi chạy trên môi trường thật.
-- Cách dùng: chỉnh biến dưới đây hoặc truyền vào khi chạy trong SSMS

SET NOCOUNT ON;

DECLARE @AccountId INT = NULL; -- nếu bạn biết account_id, gán vào đây
DECLARE @Email NVARCHAR(100) = NULL; -- hoặc gán email vào đây
-- DECLARE @Phone NVARCHAR(20) = NULL; -- (tùy chọn) dùng phone thay email

BEGIN TRANSACTION;
BEGIN TRY
    -- Nếu chỉ cung cấp Email, resolve account_id
    IF @AccountId IS NULL AND @Email IS NOT NULL
    BEGIN
        SELECT @AccountId = account_id FROM dbo.Accounts WHERE email = @Email;
    END

    IF @AccountId IS NULL
    BEGIN
        RAISERROR('Account không tìm thấy. Hãy cung cấp @AccountId hoặc @Email chính xác.', 16, 1);
    END

    PRINT 'Xóa account_id = ' + CAST(@AccountId AS NVARCHAR(20));

    -- Lấy list user_id liên quan (một account thường có 1 user nhưng kịch bản đa user được xử lý)
    DECLARE @UserIds TABLE (user_id INT PRIMARY KEY);
    INSERT INTO @UserIds (user_id)
    SELECT user_id FROM dbo.Users WHERE account_id = @AccountId;

    -- 1) Xóa các hàng trực tiếp tham chiếu account_id
    DELETE FROM dbo.CommentMentions WHERE mentioned_account_id = @AccountId;
    DELETE FROM dbo.CommentReactions WHERE account_id = @AccountId;
    DELETE FROM dbo.RefreshTokens WHERE account_id = @AccountId;
    DELETE FROM dbo.OTPs WHERE account_id = @AccountId;
    DELETE FROM dbo.BusinessPayments WHERE account_id = @AccountId;
    DELETE FROM dbo.BusinessVerificationRequests WHERE account_id = @AccountId;
    DELETE FROM dbo.AccountSanctions WHERE account_id = @AccountId;

    -- 2) Nếu có bảng Admins / AdminActions
    -- Xóa các action do admin này thực hiện (nếu admin record tồn tại)
    DECLARE @AdminIds TABLE (admin_id INT PRIMARY KEY);
    INSERT INTO @AdminIds (admin_id)
    SELECT admin_id FROM dbo.Admins WHERE account_id = @AccountId;

    DELETE FROM dbo.AdminActions WHERE admin_id IN (SELECT admin_id FROM @AdminIds);
    DELETE FROM dbo.Admins WHERE account_id = @AccountId;

    -- 3) Xóa các bản ghi phụ thuộc tới Users (dùng user_id)
    -- Ví dụ: Blocks, CloseFriends, CommentLikes, ConversationMembers, GroupMessageReads, GroupMessageReactions, Messages, etc.
    -- Xóa bằng JOIN/IN trên @UserIds

    -- Blocks (blocker_id or blocked_id reference Users.user_id)
    DELETE B
    FROM dbo.Blocks B
    WHERE B.blocker_id IN (SELECT user_id FROM @UserIds)
       OR B.blocked_id IN (SELECT user_id FROM @UserIds);

    -- CloseFriends
    DELETE CF FROM dbo.CloseFriends CF
    WHERE CF.user_id IN (SELECT user_id FROM @UserIds)
       OR CF.friend_id IN (SELECT user_id FROM @UserIds);

    -- CommentLikes (user_id)
    DELETE CL FROM dbo.CommentLikes CL
    WHERE CL.user_id IN (SELECT user_id FROM @UserIds);

    -- CommentEditHistories: if you store history by CommentId, we will delete comments below which cascades manually
    -- ConversationMembers
    IF OBJECT_ID('dbo.ConversationMembers') IS NOT NULL
    BEGIN
        DELETE CM FROM dbo.ConversationMembers CM
        WHERE CM.user_id IN (SELECT user_id FROM @UserIds);
    END

    -- GroupMessageReads
    IF OBJECT_ID('dbo.GroupMessageReads') IS NOT NULL
    BEGIN
        DELETE GMR FROM dbo.GroupMessageReads GMR
        WHERE GMR.user_id IN (SELECT user_id FROM @UserIds);
    END

    -- GroupMessageReactions
    IF OBJECT_ID('dbo.GroupMessageReactions') IS NOT NULL
    BEGIN
        DELETE GMRR FROM dbo.GroupMessageReactions GMRR
        WHERE GMRR.user_id IN (SELECT user_id FROM @UserIds);
    END

    -- GroupMessages (sender_id)
    IF OBJECT_ID('dbo.GroupMessages') IS NOT NULL
    BEGIN
        DELETE GM FROM dbo.GroupMessages GM
        WHERE GM.sender_id IN (SELECT user_id FROM @UserIds);
    END

    -- Messages (sender_id)
    IF OBJECT_ID('dbo.Messages') IS NOT NULL
    BEGIN
        DELETE M FROM dbo.Messages M
        WHERE M.sender_id IN (SELECT user_id FROM @UserIds);
    END

    -- MessageReactions
    IF OBJECT_ID('dbo.MessageReactions') IS NOT NULL
    BEGIN
        DELETE MR FROM dbo.MessageReactions MR
        WHERE MR.user_id IN (SELECT user_id FROM @UserIds);
    END

    -- 4) Xóa Comments viết bởi account/user (nếu Comments có account_id hoặc user_id)
    IF OBJECT_ID('dbo.Comments') IS NOT NULL
    BEGIN
        -- Nếu Comments có cột account_id
        IF COL_LENGTH('dbo.Comments', 'account_id') IS NOT NULL
        BEGIN
            DELETE FROM dbo.Comments WHERE account_id = @AccountId;
        END
        ELSE IF COL_LENGTH('dbo.Comments', 'user_id') IS NOT NULL
        BEGIN
            DELETE FROM dbo.Comments WHERE user_id IN (SELECT user_id FROM @UserIds);
        END
    END

    -- 5) Xóa Posts (nếu có)
    IF OBJECT_ID('dbo.Posts') IS NOT NULL
    BEGIN
        IF COL_LENGTH('dbo.Posts', 'account_id') IS NOT NULL
        BEGIN
            DELETE FROM dbo.Posts WHERE account_id = @AccountId;
        END
        ELSE IF COL_LENGTH('dbo.Posts', 'user_id') IS NOT NULL
        BEGIN
            DELETE FROM dbo.Posts WHERE user_id IN (SELECT user_id FROM @UserIds);
        END
    END

    -- 6) Nếu có bảng phụ khác tham chiếu user_id, thêm vào đây (ví dụ: Likes, Reactions on posts)
    IF OBJECT_ID('dbo.PostReactions') IS NOT NULL
    BEGIN
        DELETE PR FROM dbo.PostReactions PR
        WHERE PR.account_id = @AccountId OR PR.user_id IN (SELECT user_id FROM @UserIds);
    END

    -- 7) Xóa các bản ghi user (Users)
    DELETE FROM dbo.Users WHERE account_id = @AccountId;

    -- 8) Cuối cùng xóa account và refresh/otp đã xóa trước đó
    DELETE FROM dbo.AccountSanctions WHERE account_id = @AccountId; -- safe to attempt again
    DELETE FROM dbo.RefreshTokens WHERE account_id = @AccountId;
    DELETE FROM dbo.OTPs WHERE account_id = @AccountId;
    DELETE FROM dbo.Accounts WHERE account_id = @AccountId;

    PRINT 'Xóa hoàn tất cho account_id = ' + CAST(@AccountId AS NVARCHAR(20));
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrNum INT = ERROR_NUMBER();
    PRINT 'Lỗi khi xóa: ' + ISNULL(@ErrMsg, 'no message');
    ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- Ghi chú:
-- - Script trên cố gắng xóa hầu hết các tham chiếu phổ biến. Tùy schema cụ thể của DB, bạn có thể cần thêm các bảng khác.
-- - Luôn chạy trên bản sao DB (dev) trước khi dùng trên production.
-- - Nếu DB có nhiều ràng buộc FOREIGN KEY với ON DELETE NO ACTION, cần xóa con trước cha theo đúng thứ tự.
-- - Nếu bạn muốn tôi sửa script để xóa theo email trực tiếp, nói cho tôi email cụ thể và tôi sẽ đặt biến @Email.
