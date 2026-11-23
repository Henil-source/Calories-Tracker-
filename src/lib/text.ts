/** Lower-case, strip accents and punctuation so "Crêpe" matches "crepe". */
export function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function tokens(s: string): string[] {
  return norm(s).split(" ").filter(Boolean);
}
