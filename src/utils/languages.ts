export const LANGUAGES = [
  'English',
  'Hindi',
  'Kannada',
  'Tamil',
  'Telugu',
  'Malayalam',
  'Marathi',
  'Bengali',
  'Gujarati',
  'Punjabi',
  'Urdu',
  'Odia'
] as const;

export type Language = typeof LANGUAGES[number];
