/** Joins class names, skipping falsy ones: cx(styles.a, active && styles.b). */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
