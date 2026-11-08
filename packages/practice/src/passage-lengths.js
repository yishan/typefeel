// English is measured in words; Chinese and Cantonese in graphemes.
export const TEXT_LENGTHS = ['short', 'medium', 'long'];
export const PASSAGE_LENGTHS = {
  short: { en: [40, 79], zh: [80, 159], yue: [80, 159] },
  medium: { en: [80, 139], zh: [160, 279], yue: [160, 279] },
  long: { en: [140, 220], zh: [280, 440], yue: [280, 440] },
};
