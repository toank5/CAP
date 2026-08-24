1) Flow tổng quan
Applicant
→ xem dự án
→ tạo hồ sơ
→ upload giấy tờ
→ submit
→ theo dõi trạng thái
→ bổ sung nếu cần
→ chờ xét duyệt
→ nếu vượt số căn thì bốc thăm
→ nếu trúng thì ký hợp đồng
→ thanh toán
→ hoàn tất

Housing Developer
→ tạo dự án
→ công khai thông tin
→ tiếp nhận hồ sơ
→ kiểm tra hợp lệ
→ yêu cầu bổ sung / từ chối / xác nhận hợp lệ
→ lập danh sách dự kiến
→ gửi Sở
→ nhận phản hồi
→ tổ chức bốc thăm nếu cần
→ tạo hợp đồng
→ theo dõi thanh toán
→ công bố danh sách chính thức

Department of Construction
→ nhận danh sách từ chủ đầu tư
→ xác minh
→ loại hồ sơ không đủ điều kiện
→ trả kết quả
→ hậu kiểm danh sách chính thức

Admin
→ quản lý user/role/danh mục/log
2) Flow của Applicant
Mục tiêu
Người dân nộp hồ sơ đúng dự án, theo dõi được trạng thái và biết mình có được chọn hay không.
Luồng chi tiết
1. Mở danh sách dự án công khai.
2. Xem chi tiết dự án.
3. Nhấn "Tạo hồ sơ".
4. Nhập thông tin cá nhân.
5. Nhập thông tin hộ gia đình.
6. Chọn nhóm đối tượng.
7. Upload giấy tờ bắt buộc.
8. Kiểm tra lại hồ sơ.
9. Submit hồ sơ.
10. Chờ chủ đầu tư kiểm tra.
11. Nếu bị yêu cầu bổ sung:
    - mở màn hình hồ sơ
    - upload lại giấy tờ thiếu
    - submit bổ sung
12. Nếu hồ sơ hợp lệ:
    - chờ gửi Sở
13. Nếu được đưa vào danh sách đủ điều kiện:
    - chờ bốc thăm hoặc ký hợp đồng
14. Nếu trúng:
    - xem hợp đồng
    - ký hợp đồng
    - thanh toán
15. Nếu không trúng:
    - kết thúc hồ sơ
Trạng thái hồ sơ của Applicant
Draft
→ Submitted
→ Waiting Review
→ Need Additional
→ Valid by Developer
→ Sent to Department
→ Under Verification
→ Approved Candidate
→ Lottery Pending
→ Won / Lost
→ Contracting
→ Contract Signed
→ Payment Pending
→ Paid
→ Finalized
3) Flow của Housing Developer
Mục tiêu
Chủ đầu tư tiếp nhận, lọc hồ sơ, gửi Sở, tổ chức bốc thăm, ký hợp đồng.
Luồng chi tiết
1. Tạo và công khai dự án.
2. Nhận hồ sơ từ Applicant.
3. Mở màn hình danh sách hồ sơ.
4. Chọn một hồ sơ để xem chi tiết.
5. Kiểm tra đủ giấy tờ chưa.
6. Kiểm tra đúng đối tượng chưa.
7. Nếu thiếu:
    - yêu cầu bổ sung
8. Nếu sai:
    - từ chối hồ sơ
9. Nếu hợp lệ:
    - ghi nhận hợp lệ
    - tạo phiếu tiếp nhận
10. Gom các hồ sơ hợp lệ vào danh sách dự kiến.
11. Gửi danh sách sang Sở Xây dựng.
12. Chờ phản hồi:
    - nếu Sở loại hồ sơ nào → cập nhật lại danh sách
    - nếu Sở không phản hồi trong hạn → chuyển sang bước tiếp
13. Nếu số hồ sơ > số căn:
    - tạo phiên bốc thăm
    - mở phòng chờ
    - chạy bốc thăm
14. Nếu hồ sơ trúng:
    - tạo hợp đồng
15. Sau khi ký:
    - quản lý lịch thanh toán
16. Lập danh sách chính thức
17. Gửi hậu kiểm
Trạng thái nghiệp vụ của Developer
Received
→ Under Review
→ Need Additional
→ Rejected
→ Validated
→ Sent to Department
→ Department Feedback Received / Timeout Passed
→ Lottery Scheduled
→ Lottery Running
→ Winner Selected
→ Contract Created
→ Contract Signed
→ Payment Tracking
→ Final List Published
4) Flow của Department of Construction
Mục tiêu
Xác minh lại danh sách để đảm bảo đúng đối tượng.
Luồng chi tiết
1. Nhận danh sách từ chủ đầu tư.
2. Mở danh sách cần xác minh.
3. Xem từng hồ sơ.
4. Đối chiếu thông tin.
5. Nếu đúng:
    - đánh dấu đủ điều kiện
6. Nếu sai:
    - đánh dấu không đủ điều kiện
    - nhập lý do loại
7. Trả kết quả cho chủ đầu tư.
8. Sau khi có danh sách chính thức:
    - lưu và công bố hậu kiểm
Trạng thái của Sở
Queued
→ Verifying
→ Eligible
→ Ineligible
→ Returned Result
→ Final Archived
5) Flow bốc thăm live
Mục tiêu
Chọn người mua công khai khi hồ sơ hợp lệ vượt số căn.
Luồng chi tiết

1. Chủ đầu tư tạo phiên bốc thăm.
2. Chọn danh sách đủ điều kiện tham gia.
3. Phân nhóm ưu tiên nếu có.
4. Gửi link/OTP cho người tham gia.
5. Người dân vào sảnh chờ.
6. Đến giờ thì mở nút bốc thăm.
7. Hệ thống chạy bốc và sinh kết quả.
8. Hiển thị người trúng / không trúng.
9. Lưu log.
10. Xuất biên bản.
11. Chuyển người trúng sang bước ký hợp đồng.

Trạng thái của phiên bốc thăm
Scheduled
→ Waiting Lobby
→ Live
→ Finished
→ Published
6) Flow hợp đồng và thanh toán
Luồng chi tiết
1. Sau khi trúng hoặc được chọn trực tiếp, chủ đầu tư tạo hợp đồng.
2. Applicant mở chi tiết hợp đồng.
3. Hai bên ký hợp đồng.
4. Hệ thống tạo lịch thanh toán.
5. Ghi nhận đợt thanh toán 1, 2, cuối.
6. Cập nhật trạng thái paid / unpaid / overdue.
7. Sau khi hoàn tất thì chuyển sang hậu kiểm.
Trạng thái
Contract Draft
→ Contracting
→ Signed
→ Payment Pending
→ Partially Paid
→ Paid
→ Finalized
7) Flow admin
1. Đăng nhập admin.
2. Quản lý user.
3. Gán role.
4. Quản lý danh mục.
5. Quản lý trạng thái hồ sơ.
6. Xem log hệ thống.
7. Xem dữ liệu cấu hình.
8) Flow dữ liệu liên kết giữa các vai trò
Applicant tạo hồ sơ
→ Developer nhận và review
→ Developer gửi Sở
→ Sở xác minh
→ Developer tổ chức bốc thăm nếu cần
→ Applicant trúng thì ký hợp đồng
→ Developer theo dõi thanh toán
→ Sở và Developer công bố danh sách chính thức
9) Nếu bạn đưa vào đồ án thì nên trình bày thế nào
Bạn có thể đưa vào báo cáo theo 4 sơ đồ:
Use case diagram theo role.
Activity diagram cho luồng hồ sơ.
State machine cho application.
Sequence diagram cho bốc thăm và ký hợp đồng.
10) Kết luận ngắn
Nếu nói dễ hiểu thì toàn bộ hệ thống của bạn chỉ xoay quanh 1 vòng đời:
xem dự án → nộp hồ sơ → duyệt → xác minh → bốc thăm → ký hợp đồng → thanh toán → hậu kiểm

