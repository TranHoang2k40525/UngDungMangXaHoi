-- Thêm cột reaction_type vào bảng Notifications
-- Cột này lưu loại reaction (1-6) cho các thông báo reaction
-- ReactionType: Like(1), Love(2), Haha(3), Wow(4), Sad(5), Angry(6)

-- Chạy câu lệnh này trực tiếp
ALTER TABLE Notifications ADD reaction_type INT;
