// IUH Library Brand Colors
// Primary: Navy Blue (#1E6091) — học thuật, tin cậy
// Secondary: Warm Amber (#D97706) — ấm áp, thư viện, sách vở
// Không dùng generic indigo (#4F46E5) — màu AI mặc định

export const baseColors = {
  // Brand palette
  primary:       '#1E6091',   // IUH Navy Blue
  primaryDark:   '#154E78',   // Navy hover / pressed
  primaryLight:  '#2980B9',   // Navy lighter variant

  secondary:     '#D97706',   // Warm Amber
  secondaryDark: '#B45309',   // Amber hover
  secondaryLight:'#F59E0B',   // Amber lighter

  // Dark mode surfaces (deep ocean)
  background:    '#0B1929',   // Sâu hơn, ít slate hơn — thực tế hơn
  surface:       '#102236',   // Card surface
  surfaceVariant:'#1A3347',   // Elevated surface

  // Light mode surfaces
  backgroundLight:  '#F4F8FC',
  surfaceLight:     '#FFFFFF',
  surfaceVariantLight: '#E8F2F9',

  // Semantic
  error:         '#DC2626',
  errorDark:     '#991B1B',
  success:       '#059669',
  successLight:  '#D1FAE5',
  warning:       '#D97706',
  warningLight:  '#FEF3C7',

  // Text
  text:          '#EEF2F7',   // Light text on dark
  textSecondary: '#8FA8BF',
  textDisabled:  '#4A6275',
  textDark:      '#1A2744',   // Dark text on light
  textDarkSecondary: '#4B6484',

  // Borders
  border:        '#1E3347',
  borderLight:   '#C8DCEA',
  divider:       '#132232',
  dividerLight:  '#D5E3EE',

  // Misc
  overlay: 'rgba(11, 25, 41, 0.7)',
  card:    '#102236',
  notification: '#D97706',    // Amber for notifications (thay vì orange)
  bookmark: '#1E6091',        // Navy for bookmarks
  glow: 'rgba(30, 96, 145, 0.12)',
};

export type BaseColors = typeof baseColors;