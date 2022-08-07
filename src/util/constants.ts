interface ColorOption {
  label: string;
  value: string | number;
  emoji?: string;
  default?: boolean;
}

export const BLOOD_RED = 0x992d22;

export const COLORS: ColorOption[] = [
  { emoji: '🔵', value: 0x5865f2, label: 'Blurple' },
  { emoji: '🟢', value: 0x57f287, label: 'Green' },
  { emoji: '🟡', value: 0xfee75c, label: 'Yellow' },
  { emoji: '🟣', value: 0xeb459e, label: 'Fuchsia' },
  { emoji: '🔴', value: 0xed4245, label: 'Red' },
  { emoji: '⚪', value: 0xffffff, label: 'White' },
  { emoji: '⚫', value: 0x000000, label: 'Black' },
  { emoji: '🎲', value: 'random', label: 'Random', default: true }
];
