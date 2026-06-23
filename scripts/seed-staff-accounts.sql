-- Tạo 2 tài khoản cán bộ: Quản lý phường + Cán bộ thẩm định
-- Mật khẩu: xem output khi chạy script hoặc README trong chat

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'ql.phuong@fecaps.vn')
BEGIN
    INSERT INTO Users (Id, RoleId, FullName, Email, PhoneNumber, PasswordHash, Status, CreatedAt, IsEmailVerified)
    VALUES (
        'a1111111-1111-1111-1111-111111111111',
        '55555555-5555-5555-5555-555555555555',
        N'Nguyễn Văn Quản Lý Phường',
        'ql.phuong@fecaps.vn',
        '0901000001',
        '$2a$11$y9XDi9/xO6j8oK/bdn1/hu4gAVXnqlEbnQ3hopVg/RRa6tBb68eAe',
        'Active',
        GETUTCDATE(),
        1
    );
END

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'canbo.thamdinh@fecaps.vn')
BEGIN
    INSERT INTO Users (Id, RoleId, FullName, Email, PhoneNumber, PasswordHash, Status, CreatedAt, IsEmailVerified)
    VALUES (
        'b2222222-2222-2222-2222-222222222222',
        '66666666-6666-6666-6666-666666666666',
        N'Trần Thị Cán Bộ Thẩm Định',
        'canbo.thamdinh@fecaps.vn',
        '0901000002',
        '$2a$11$6o8c5mrwa3dP73/j7Reo.u0bVuWNkiNTwno6HGv7fcO9bQSdrXBxq',
        'Active',
        GETUTCDATE(),
        1
    );
END

SELECT u.Email, u.FullName, r.RoleName, u.Status, u.IsEmailVerified
FROM Users u
JOIN Roles r ON u.RoleId = r.Id
WHERE u.Email IN ('ql.phuong@fecaps.vn', 'canbo.thamdinh@fecaps.vn');
