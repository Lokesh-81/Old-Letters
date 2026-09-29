export function cn(...inputs: (string | undefined | null | false | boolean)[]): string {
  return inputs.filter(Boolean).join(' ');
}
