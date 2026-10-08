import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { LOGIN_CODE_LENGTH } from '@/domain/auth/code'
import { EMAIL_MAX_LENGTH } from '@/domain/auth/email'
import { needsProfile } from '@/domain/auth/User'
import { InvalidNameError } from '@/domain/shared/errors'
import { NAME_MAX_LENGTH } from '@/domain/shared/name'
import type { LoginRedirect } from '../auth/RequireAuth'
import { useSession } from '../auth/useSession'
import { errorMessage } from '../errors'
import { useCompleteProfile, useRequestLoginCode, useVerifyLoginCode } from '../hooks/useAuth'
import { useI18n } from '../i18n/i18n'
import { LanguageSelect } from '../i18n/LanguageSelect'
import { ThemeToggle } from '../theme/ThemeToggle'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { TitleRule } from '../ui/TitleRule'
import styles from './LoginPage.module.css'

const RESEND_COOLDOWN_SECONDS = 30
const TOTAL_STEPS = 3

/**
 * Sign-in and sign-up in one: email -> 6-digit code -> (new users only)
 * name and company. The step after the code follows the session itself.
 */
export function LoginPage() {
  const session = useSession()
  const location = useLocation()
  const [email, setEmail] = useState<string | null>(null)

  if (session && !needsProfile(session.user)) {
    const from = (location.state as LoginRedirect | null)?.from
    return <Navigate to={from && from !== '/login' ? from : '/'} replace />
  }

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <span className={styles.brand}>
          <span className={styles.mark} aria-hidden="true">
            TK
          </span>
          Team/Knowledge
        </span>
        <div className={styles.prefs}>
          <ThemeToggle />
          <LanguageSelect />
        </div>
      </div>

      <section className={styles.card}>
        {session ? (
          <ProfileStep />
        ) : email === null ? (
          <EmailStep onSent={setEmail} />
        ) : (
          <CodeStep email={email} onChangeEmail={() => setEmail(null)} />
        )}
      </section>
    </main>
  )
}

function StepHeader(props: { step: number; title: string; subtitle: string }) {
  const { t } = useI18n()
  return (
    <header className={styles.header}>
      <p className={styles.step}>{t('auth.step', { step: props.step, total: TOTAL_STEPS })}</p>
      <h1 className={styles.title}>{props.title}</h1>
      <TitleRule className={styles.underline} />
      <p className={styles.subtitle}>{props.subtitle}</p>
    </header>
  )
}

function EmailStep({ onSent }: { onSent: (email: string) => void }) {
  const { t } = useI18n()
  const request = useRequestLoginCode()
  const [email, setEmail] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    request.mutate(email, { onSuccess: () => onSent(email) })
  }

  return (
    <form onSubmit={onSubmit} className={styles.form} noValidate>
      <StepHeader step={1} title={t('auth.title')} subtitle={t('auth.subtitle')} />
      <label className={styles.field}>
        <span className={styles.label}>{t('auth.email')}</span>
        <Input
          type="email"
          autoComplete="email"
          autoFocus
          required
          maxLength={EMAIL_MAX_LENGTH}
          value={email}
          placeholder={t('auth.emailPlaceholder')}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={request.error != null}
        />
      </label>
      {request.error != null && <p className={styles.error}>{errorMessage(request.error, t)}</p>}
      <Button type="submit" variant="primary" className={styles.submit} disabled={request.isPending}>
        {t('auth.getCode')}
      </Button>
    </form>
  )
}

function CodeStep({ email, onChangeEmail }: { email: string; onChangeEmail: () => void }) {
  const { t } = useI18n()
  const verify = useVerifyLoginCode()
  const resend = useRequestLoginCode()
  const [code, setCode] = useState('')
  const cooldown = useCountdown(RESEND_COOLDOWN_SECONDS)

  const submit = (value: string) => verify.mutate({ email, code: value })

  const onChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, LOGIN_CODE_LENGTH)
    setCode(digits)
    if (verify.error != null) verify.reset()
    // Typing (or pasting) the last digit submits: no extra click.
    if (digits.length === LOGIN_CODE_LENGTH && digits !== code) submit(digits)
  }

  const onResend = () => {
    resend.mutate(email, { onSuccess: cooldown.restart })
    setCode('')
    verify.reset()
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit(code)
      }}
      className={styles.form}
      noValidate
    >
      <StepHeader step={2} title={t('auth.codeTitle')} subtitle={t('auth.codeSent', { email })} />
      <label className={styles.field}>
        <span className={styles.label}>{t('auth.code')}</span>
        <Input
          className={styles.code}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={LOGIN_CODE_LENGTH}
          value={code}
          placeholder={'•'.repeat(LOGIN_CODE_LENGTH)}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={verify.error != null}
          disabled={verify.isPending}
        />
      </label>
      {verify.error != null && <p className={styles.error}>{errorMessage(verify.error, t)}</p>}
      {resend.error != null && <p className={styles.error}>{errorMessage(resend.error, t)}</p>}
      {resend.isSuccess && verify.error == null && <p className={styles.note}>{t('auth.resent')}</p>}
      <Button
        type="submit"
        variant="primary"
        className={styles.submit}
        disabled={verify.isPending || code.length !== LOGIN_CODE_LENGTH}
      >
        {t('auth.verify')}
      </Button>
      <div className={styles.links}>
        <Button variant="link" size="sm" onClick={onChangeEmail}>
          {t('auth.changeEmail')}
        </Button>
        <Button variant="link" size="sm" onClick={onResend} disabled={cooldown.seconds > 0 || resend.isPending}>
          {cooldown.seconds > 0 ? t('auth.resendIn', { seconds: cooldown.seconds }) : t('auth.resend')}
        </Button>
      </div>
    </form>
  )
}

function ProfileStep() {
  const { t } = useI18n()
  const complete = useCompleteProfile()
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    complete.mutate({ name, company })
  }

  return (
    <form onSubmit={onSubmit} className={styles.form} noValidate>
      <StepHeader step={3} title={t('auth.profileTitle')} subtitle={t('auth.profileSubtitle')} />
      <label className={styles.field}>
        <span className={styles.label}>{t('auth.name')}</span>
        <Input
          autoComplete="name"
          autoFocus
          required
          maxLength={NAME_MAX_LENGTH}
          value={name}
          placeholder={t('auth.namePlaceholder')}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={complete.error != null}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>
          {t('auth.company')} <span className={styles.optional}>{t('auth.optional')}</span>
        </span>
        <Input
          autoComplete="organization"
          maxLength={NAME_MAX_LENGTH}
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </label>
      {complete.error != null && (
        <p className={styles.error}>
          {complete.error instanceof InvalidNameError ? t('auth.nameRequired') : errorMessage(complete.error, t)}
        </p>
      )}
      <Button type="submit" variant="primary" className={styles.submit} disabled={complete.isPending}>
        {t('auth.continue')}
      </Button>
    </form>
  )
}

/** Seconds left before "send again" is allowed; starts counting on mount. */
function useCountdown(total: number) {
  const [until, setUntil] = useState(() => Date.now() + total * 1000)
  const [now, setNow] = useState(() => Date.now())
  const seconds = Math.max(0, Math.ceil((until - now) / 1000))

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= until) window.clearInterval(timer)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [until])

  return {
    seconds,
    restart: () => {
      const start = Date.now()
      setNow(start)
      setUntil(start + total * 1000)
    },
  }
}
