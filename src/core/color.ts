export interface Color {
  blue: string;
  green: string;
  yellow: string;
  red: string;
}

export default {
  blue: "\x1b[34m%s\x1b[0m",
  green: "\x1b[32m%s\x1b[0m",
  yellow: "\x1b[33m%s\x1b[0m",
  red: "\x1b[31m%s\x1b[0m",
} as Color;
