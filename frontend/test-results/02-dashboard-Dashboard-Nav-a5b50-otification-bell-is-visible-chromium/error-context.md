# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 02-dashboard.spec.ts >> Dashboard >> Navigation >> notification bell is visible
- Location: tests/e2e/02-dashboard.spec.ts:87:5

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - heading "ĐIỂM HẸN BILLIARDS" [level=2] [ref=e7]:
          - generic [ref=e8]: ĐIỂM HẸN BILLIARDS
        - generic [ref=e9]: Staff Portal
      - navigation [ref=e10]:
        - link "📊 DASHBOARD" [ref=e11] [cursor=pointer]:
          - /url: /dashboard
          - generic [ref=e12]: 📊
          - generic [ref=e13]: DASHBOARD
        - link "🕒 ATTENDANCE" [ref=e14] [cursor=pointer]:
          - /url: /attendance
          - generic [ref=e15]: 🕒
          - generic [ref=e16]: ATTENDANCE
        - link "📋 HISTORY" [ref=e17] [cursor=pointer]:
          - /url: /attendance-history
          - generic [ref=e18]: 📋
          - generic [ref=e19]: HISTORY
        - link "📅 SHIFTS" [ref=e20] [cursor=pointer]:
          - /url: /schedule
          - generic [ref=e21]: 📅
          - generic [ref=e22]: SHIFTS
        - link "📋 TASKS" [ref=e23] [cursor=pointer]:
          - /url: /tasks
          - generic [ref=e24]: 📋
          - generic [ref=e25]: TASKS
    - generic [ref=e26]:
      - generic [ref=e27]:
        - generic [ref=e28] [cursor=pointer]:
          - img "Avatar" [ref=e29]
          - generic [ref=e30]:
            - generic [ref=e31]: Staff User
            - generic [ref=e32]: staff
          - generic [ref=e33]: ▼
        - button "🔴 CLOCK IN" [ref=e34] [cursor=pointer]
      - generic [ref=e35] [cursor=pointer]:
        - generic [ref=e36]: 🚪
        - generic [ref=e37]: ĐĂNG XUẤT
  - generic [ref=e38]:
    - banner [ref=e39]:
      - generic [ref=e40]:
        - text: "📍 Chi nhánh:"
        - strong [ref=e41]: Nguyễn Oanh, Gò Vấp
      - generic [ref=e42]:
        - generic [ref=e43]: 🕒 22:26:23
        - generic [ref=e44]:
          - button "🔔" [ref=e46] [cursor=pointer]
          - button "⚙️" [ref=e47] [cursor=pointer]
    - main [ref=e48]:
      - generic [ref=e49]:
        - generic [ref=e50]:
          - heading "Bảng điều khiển" [level=1] [ref=e51]
          - textbox "Tìm kiếm nhiệm vụ..." [ref=e53]
        - generic [ref=e54]:
          - generic [ref=e55]:
            - generic [ref=e56]:
              - generic [ref=e57]:
                - generic [ref=e58]: Chào buổi chiều, Staff!
                - heading "Sẵn sàng cho ca tối chưa?" [level=2] [ref=e59]
                - generic [ref=e60]:
                  - generic [ref=e61]: ●
                  - generic [ref=e62]:
                    - text: Bạn hiện đang
                    - strong [ref=e63]: CHƯA CHẤM CÔNG (Ngoại tuyến)
              - generic [ref=e64]:
                - button "➔ CHẤM CÔNG VÀO" [ref=e65] [cursor=pointer]
                - button "← CHẤM CÔNG RA" [disabled] [ref=e66]
            - generic [ref=e67]:
              - generic [ref=e68]:
                - generic [ref=e69]: Ca tiếp theo
                - generic [ref=e70]: 📅
                - generic [ref=e71]: Chưa có ca được giao
                - generic [ref=e72]: "--"
                - generic [ref=e73]: 📍 Liên hệ quản lý để được phân công
              - generic [ref=e74]:
                - generic [ref=e75]: Tháng /
                - generic [ref=e76]: 💵
                - generic [ref=e77]: Thu nhập dự kiến
                - generic [ref=e78]: 0đ
                - generic [ref=e79]: Chưa có dữ liệu
            - generic [ref=e80]:
              - generic [ref=e81]:
                - heading "Nhiệm vụ được giao" [level=3] [ref=e82]
                - generic [ref=e83] [cursor=pointer]: Xem tất cả
              - generic [ref=e85]:
                - generic [ref=e86]: 📋
                - generic [ref=e87]: Chưa có nhiệm vụ nào được giao
                - generic [ref=e88]: Nhiệm vụ sẽ xuất hiện ở đây khi được phân công
          - generic [ref=e89]:
            - generic [ref=e90]:
              - heading "Trạng thái bàn hiện tại" [level=4] [ref=e91]
              - generic [ref=e92]:
                - generic [ref=e93]:
                  - generic [ref=e94]: "-"
                  - generic [ref=e95]: Trống
                - generic [ref=e96]:
                  - generic [ref=e97]: "-"
                  - generic [ref=e98]: Đang chơi
              - button "CHI TIẾT BÀN" [ref=e99] [cursor=pointer]
            - generic [ref=e100]:
              - heading "Thông báo gần đây" [level=4] [ref=e101]
              - generic [ref=e103]:
                - generic [ref=e104]: 🔔
                - generic [ref=e105]: Chưa có thông báo nào
              - button "XEM TẤT CẢ THÔNG BÁO" [ref=e106] [cursor=pointer]
            - generic [ref=e107]:
              - generic [ref=e108]: CƠ HỘI THĂNG TIẾN
              - heading "Tuyển Trưởng ca mới" [level=4] [ref=e109]
              - paragraph [ref=e110]: Đăng ký phỏng vấn nội bộ trước 31/10.
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { clearAuth, setAuth } from './auth-helpers';
  3   | 
  4   | test.describe('Dashboard', () => {
  5   |   test.describe('Staff View', () => {
  6   |     test.beforeEach(async ({ page }) => {
  7   |       // setAuth navigates to /login and sets localStorage
  8   |       await setAuth(page, 'staff');
  9   |       // Now navigate to the actual test target
  10  |       await page.goto('/dashboard');
  11  |     });
  12  | 
  13  |     test('loads dashboard for authenticated staff', async ({ page }) => {
  14  |       await page.waitForLoadState('domcontentloaded');
  15  |       expect(page.url()).toContain('dashboard');
  16  |     });
  17  | 
  18  |     test('shows attendance section', async ({ page }) => {
  19  |       await page.waitForLoadState('networkidle').catch(() => {});
  20  |       const attendanceSection = page.locator('text=/Điểm danh|Chấm công|Attendance/i').first();
  21  |       const exists = await attendanceSection.isVisible({ timeout: 3000 }).catch(() => false);
  22  |       expect(exists || page.url().includes('login')).toBeTruthy();
  23  |     });
  24  | 
  25  |     test('shows tasks section', async ({ page }) => {
  26  |       await page.waitForLoadState('networkidle').catch(() => {});
  27  |       const tasksArea = page.locator('text=/Nhiệm vụ|Tasks/i').first();
  28  |       const exists = await tasksArea.isVisible({ timeout: 3000 }).catch(() => false);
  29  |       expect(exists || page.url().includes('login')).toBeTruthy();
  30  |     });
  31  | 
  32  |     test('shows notification bell', async ({ page }) => {
  33  |       await page.waitForLoadState('networkidle').catch(() => {});
  34  |       const bell = page.locator('[class*="bell"], [class*="notification"]').first();
  35  |       const exists = await bell.isVisible({ timeout: 3000 }).catch(() => false);
  36  |       expect(exists || page.url().includes('login')).toBeTruthy();
  37  |     });
  38  | 
  39  |     test('shows logout button', async ({ page }) => {
  40  |       await page.waitForLoadState('networkidle').catch(() => {});
  41  |       const logoutBtn = page.locator('button', { hasText: /Đăng xuất|Logout/i }).first();
  42  |       const exists = await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false);
  43  |       expect(exists || page.url().includes('login')).toBeTruthy();
  44  |     });
  45  |   });
  46  | 
  47  |   test.describe('Admin View', () => {
  48  |     test.beforeEach(async ({ page }) => {
  49  |       await setAuth(page, 'admin');
  50  |       await page.goto('/dashboard');
  51  |     });
  52  | 
  53  |     test('loads dashboard for authenticated admin', async ({ page }) => {
  54  |       await page.waitForLoadState('domcontentloaded');
  55  |       expect(page.url()).toContain('dashboard');
  56  |     });
  57  | 
  58  |     test('shows admin navigation sidebar', async ({ page }) => {
  59  |       await page.waitForLoadState('networkidle').catch(() => {});
  60  |       const navArea = page.locator('nav, [class*="sidebar"]').first();
  61  |       const exists = await navArea.isVisible({ timeout: 3000 }).catch(() => false);
  62  |       expect(exists || page.url().includes('login')).toBeTruthy();
  63  |     });
  64  | 
  65  |     test('shows KPI or stats area', async ({ page }) => {
  66  |       await page.waitForLoadState('networkidle').catch(() => {});
  67  |       const statsArea = page.locator('text=/Tổng|Người|Nhân viên|Điểm danh/i').first();
  68  |       const exists = await statsArea.isVisible({ timeout: 3000 }).catch(() => false);
  69  |       expect(exists || page.url().includes('login')).toBeTruthy();
  70  |     });
  71  | 
  72  |     test('shows schedule and reports links in admin sidebar', async ({ page }) => {
  73  |       await page.waitForLoadState('networkidle').catch(() => {});
  74  |       const scheduleLink = page.locator('text=/Lịch|Schedule|Phân công/i').first();
  75  |       const exists = await scheduleLink.isVisible({ timeout: 3000 }).catch(() => false);
  76  |       expect(exists || page.url().includes('login')).toBeTruthy();
  77  |     });
  78  |   });
  79  | 
  80  |   test.describe('Navigation', () => {
  81  |     test.beforeEach(async ({ page }) => {
  82  |       await setAuth(page, 'staff');
  83  |       await page.goto('/dashboard');
  84  |       await page.waitForLoadState('networkidle').catch(() => {});
  85  |     });
  86  | 
  87  |     test('notification bell is visible', async ({ page }) => {
  88  |       const bell = page.locator('[class*="bell"], [class*="notification"]').first();
  89  |       const exists = await bell.isVisible({ timeout: 3000 }).catch(() => false);
> 90  |       expect(exists || page.url().includes('login')).toBeTruthy();
      |                                                      ^ Error: expect(received).toBeTruthy()
  91  |     });
  92  | 
  93  |     test('user profile shows role info', async ({ page }) => {
  94  |       const profile = page.locator('text=/Staff|Nhân viên|Admin|Quản lý/i').first();
  95  |       const exists = await profile.isVisible({ timeout: 3000 }).catch(() => false);
  96  |       expect(exists || page.url().includes('login')).toBeTruthy();
  97  |     });
  98  | 
  99  |     test('logout button clears auth and redirects to login', async ({ page }) => {
  100 |       const logoutBtn = page.locator('button', { hasText: /Đăng xuất|Logout/i }).first();
  101 |       const exists = await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false);
  102 |       if (exists) {
  103 |         await logoutBtn.click();
  104 |         await page.waitForURL(/\/login/, { timeout: 8000 }).catch(() => {});
  105 |         expect(page.url()).toContain('login');
  106 |       }
  107 |     });
  108 |   });
  109 | });
  110 | 
```