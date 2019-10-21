export interface Color {
  blue: string;
  green: string;
}

export default {
  blue: "\x1b[34m%s\x1b[0m",
  green: "\x1b[32m%s\x1b[0m",
} as Color;
