import { AppIcon } from '../components/icons'
import { useLogout } from '../hooks/useAuth'
import { useI18n } from '../i18n/i18n'
import { IconButton } from '../ui/IconButton'
import { cx } from '../ui/cx'
import styles from './UserPanel.module.css'
import { useSession } from './useSession'

/**
 * Who is signed in + "sign out".
 * - `panel`: sidebar block — avatar, name, company (or email);
 * - `bar`: top bar of the list pages — avatar and name in one line;
 * - `icon`: collapsed sidebar rail — the sign-out button only (name in the tooltip).
 */
export function UserPanel({ variant }: { variant: 'panel' | 'bar' | 'icon' }) {
  const { t } = useI18n()
  const session = useSession()
  const logout = useLogout()
  if (!session) return null
  const { user } = session
  const name = user.name ?? user.email
  const logoutButton = (
    <IconButton label={`${t('auth.logout')} (${name})`} size="sm" onClick={logout}>
      <AppIcon name="logout" />
    </IconButton>
  )
  if (variant === 'icon') return logoutButton

  return (
    <div className={cx(styles.user, styles[variant])} title={user.email}>
      <span className={styles.avatar} aria-hidden="true">
        {initials(name)}
      </span>
      <span className={styles.text}>
        <span className={styles.name}>{name}</span>
        {variant === 'panel' && <span className={styles.meta}>{user.company ?? user.email}</span>}
      </span>
      {logoutButton}
    </div>
  )
}

/** "Анна Иванова" -> "АИ", "ann@example.com" -> "A". */
function initials(name: string): string {
  const words = name.split(/[\s@._-]+/).filter(Boolean)
  const letters = name.includes('@') ? words.slice(0, 1) : words.slice(0, 2)
  return letters.map((w) => w[0]?.toUpperCase() ?? '').join('') || '?'
}
