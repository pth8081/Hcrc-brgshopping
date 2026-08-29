import { renderLayout, escapeHtml } from '../layout.js';

const PAGES = {
  've-chung-toi': { title: 'Về BRG Shopping', body: 'BRG Shopping là chuỗi bán lẻ hàng tiêu dùng, mang đến trải nghiệm mua sắm tiện lợi với đa dạng ngành hàng.' },
  'khuyen-mai': { title: 'Khuyến mãi', body: 'Các chương trình khuyến mãi hiện chưa được cập nhật. Vui lòng quay lại sau.' },
  'the-thanh-vien': { title: 'Thẻ thành viên', body: 'Chương trình thẻ thành viên đang được xây dựng — khách hàng thân thiết sẽ sớm nhận được nhiều ưu đãi hấp dẫn.' },
  'tuyen-dung': { title: 'Tuyển dụng', body: 'Hiện chưa có vị trí tuyển dụng nào được đăng tải.' },
  'tin-tuc': { title: 'Tin tức', body: 'Chưa có bài viết nào.' },
  'lien-he': { title: 'Liên hệ', body: 'Hotline hỗ trợ khách hàng: 1900 0000 · Email: cskh@brgshopping.demo' },
};

renderLayout({});

const slug = new URLSearchParams(location.search).get('slug');
const page = PAGES[slug];
const el = document.getElementById('page-content');

if (page) {
  document.title = `${page.title} — BRG Shopping`;
  el.innerHTML = `
    <div class="big-icon">📄</div>
    <h1 style="font-size:20px; margin-bottom:10px; color:var(--ink);">${escapeHtml(page.title)}</h1>
    <p style="max-width:52ch; margin:0 auto;">${escapeHtml(page.body)}</p>`;
} else {
  el.innerHTML = `<div class="big-icon">🧭</div><p>Không tìm thấy trang này.</p>`;
}
