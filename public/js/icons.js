// Small flat line-icon set matched to category names by keyword, so the
// category grid looks consistent even though categories are data-driven.
const ICONS = {
  meat: '<path d="M7 4c3 0 6 2 6 6 0 3-2 5-2 5l3 3-2 2-3-3s-2 2-5 2c-4 0-7-3-7-7a7 7 0 0 1 10-6z"/><circle cx="8.5" cy="9.5" r="1.2" fill="currentColor" stroke="none"/>',
  vegetable: '<path d="M12 3c1 2 1 3.5 0 5"/><path d="M12 8c5 0 8 3.5 8 8s-3 5-8 5-8-1-8-5 3-8 8-8z"/>',
  frozen: '<path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11"/><path d="M9 4l3-2 3 2M9 20l3 2 3-2M4.5 9.5l0-3.5 3-1M4.5 14.5l0 3.5 3 1M19.5 9.5l0-3.5-3-1M19.5 14.5l0 3.5-3 1"/>',
  snack: '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="14" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="1" fill="currentColor" stroke="none"/><circle cx="10" cy="15" r="1" fill="currentColor" stroke="none"/>',
  drink: '<path d="M7 3h10l-1.2 15a2 2 0 0 1-2 1.8h-3.6a2 2 0 0 1-2-1.8L7 3z"/><path d="M6 8h12"/>',
  dry: '<path d="M6 8l1-4h10l1 4"/><path d="M5 8h14l-1.2 11.2A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.8L5 8z"/><path d="M9 12h6M9 15.5h6"/>',
  produce: '<path d="M12 22V10"/><path d="M12 13c0-4-3-6-7-6 0 4 3 6 7 6z"/><path d="M12 10c0-4 3-6 7-6 0 4-3 6-7 6z"/>',
  cosmetics: '<path d="M10 2h4v3h-4z"/><path d="M9 5h6l1 4H8l1-4z"/><path d="M8 9h8l-.8 10.2A2 2 0 0 1 13.2 21h-2.4a2 2 0 0 1-2-1.8L8 9z"/>',
  cleaning: '<path d="M9 2h4v3H9z"/><path d="M8 5h6l1.5 3H6.5L8 5z"/><path d="M6.5 8h11L16 21H8L6.5 8z"/><path d="M10 12h4"/>',
  household: '<path d="M4 11.5L12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9"/><path d="M10 20v-6h4v6"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  fashion: '<path d="M9 3l3 2 3-2 4 3-2.5 3L15 8v13H9V8L7.5 9 5 6l4-3z"/>',
  appliance: '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="9" r="3.2"/><path d="M9 16h6"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>',
  toy: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M6 11c-2 0-3 2-2 5l1 5h3l1-6M18 11c2 0 3 2 2 5l-1 5h-3l-1-6"/>',
  tag: '<path d="M3 12l9-9h7a2 2 0 0 1 2 2v7l-9 9a2 2 0 0 1-2.8 0L3 14.8a2 2 0 0 1 0-2.8z"/><circle cx="15" cy="9" r="1.3" fill="currentColor" stroke="none"/>',
};

const KEYWORD_MAP = [
  [/thịt|cá\b|hải sản|thuỷ sản/i, 'meat'],
  [/rau|hoa quả|trái cây|củ quả/i, 'vegetable'],
  [/đông lạnh|đá\b/i, 'frozen'],
  [/bánh|kẹo|snack/i, 'snack'],
  [/uống|nước ngọt|bia|nước giải khát/i, 'drink'],
  [/khô|gia vị|gạo|mì/i, 'dry'],
  [/nông sản/i, 'produce'],
  [/mỹ phẩm|làm đẹp/i, 'cosmetics'],
  [/tẩy rửa|vệ sinh/i, 'cleaning'],
  [/giấy|bông|gia dụng|đồ dùng/i, 'household'],
  [/điện thoại|laptop|máy tính|thiết bị/i, 'phone'],
  [/thời trang|quần áo|giày|dép|váy|áo/i, 'fashion'],
  [/nồi|máy xay|điện máy|gia điện/i, 'appliance'],
  [/sách|văn phòng phẩm/i, 'book'],
  [/đồ chơi|trẻ em|mẹ và bé/i, 'toy'],
];

export function categoryIcon(name = '') {
  const key = KEYWORD_MAP.find(([pattern]) => pattern.test(name))?.[1] || 'tag';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[key]}</svg>`;
}
