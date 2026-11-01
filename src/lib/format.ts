export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPrice(value: number) {
  return `${formatNumber(value)} جنيه`;
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
