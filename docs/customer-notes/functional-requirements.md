# Dự án OCR CBAM
Xây dựng hệ thống tự động hóa việc tính toán dấu chân Carbon và nghĩa vụ tài chính theo cơ chế CBAM (EU). Mục tiêu là giúp doanh nghiệp minh bạch hóa dữ liệu phát thải từ chuỗi cung ứng, tối ưu chi phí thuế Carbon và sẵn sàng cho kiểm toán quốc tế.

## Yêu cầu chức năng
### Module 1: Thu thập Dữ liệu Thông minh
- INPUT: Quét ảnh hóa đơn, chứng từ vận chuyển, phiếu nhập kho (png, jpg, ...), tải lên tập dữ liệu (PDF, XML, CSV, XLSX).
- Phân loại tự động (Scope 1, 2, 3): Sử dụng LLM hoặc cái gì đó để phân hóa dữ liệu vào 3 nhóm:
    - Nhóm I (Tiền chất): Hóa đơn nguyên liệu đầu vào.
    - Nhóm II (Gián tiếp): Hóa đơn điện, xăng, dầu.
    - Nhóm III (Trực tiếp): Nhiên liệu dùng trực tiếp trong sản xuất.
- Xử lý vùng không rõ: Tự động phát hiện dữ liệu thiếu hoặc độ tin cậy thấp
- OUTPUT: Dữ liệu đã được làm sạch, có đánh dấu độ tin cậy để người dùng có thể chỉnh sửa. Lưu lại một số thông tin vào ERP.
### Module 2: Tính toán
- INPUT: Dữ liệu được làm sạch và chỉnh sửa từ module 1.
- Tự động ánh xạ (mapping) nguyên liệu với bộ hệ số phát thải thực tế (EU CBAM hoặc mặc định quốc gia).
- Định giá Carbon: Cập nhật giá chứng chỉ Carbon thời gian thực từ thị trường Châu Âu (EU ETS) để dự báo số thuế phải nộp.
- Áp dụng công thức tính toán:
    - Công thức SEE?
- OUTPUT: Thống kê chi phí cần phải chi trả cho khoản thuế CBAM. Lưu lại thông tin vào ERP
### Module Kiểm soát & Tuân thủ
- Báo động đỏ (UI Flags): Hiển thị cảnh báo tại các trường dữ liệu AI không chắc chắn để User duyệt tay. (Sẽ có logging lại để truy vết)
- Lịch sử chỉnh sửa (Logging và Audit Trail): Lưu vết chi tiết mọi thay đổi (Version control).
- Xuất báo cáo: Tự động trích xuất file báo cáo định kỳ dạng XML/JSON theo đúng cấu trúc cổng thông tin CBAM của EU.
- Kết nối API trực tiếp từ các nền tảng ERP, lưu lại thông tin .
(ERP là một phần mềm kiểm sóat hóa đơn được sử dụng bởi các côgn ty, giúp các công ty đảm bảo dữ liệu của chộ đó được đồng bộ trên 1 nền tảng duy nhất)

## Yêu cầu phi chức năng:
### Khả năng tự handle lỗi:
Với các lỗi dưới đây, hệ thống sẽ không cho phép người dùng sử dụng:
- Khi ERP API không hoạt động, hệ thống sẽ báo lỗi.
- Khi OCR module detect ảnh có độ tin cậy quá thấp, hệ thống sẽ báo lỗi và yêu cầu người dùng chọn ảnh/chụp ảnh mới.
- Khi Định dạng đầu vào không hỗ trợ, hệ thống sẽ báo lỗi.
### Yêu cầu hệ thống:
- Hệ thống chạy được