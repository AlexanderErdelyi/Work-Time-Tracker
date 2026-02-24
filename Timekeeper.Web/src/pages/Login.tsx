import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import type { UserRole } from '../types'

type AuthMode = 'signin' | 'signup'
type AuthMethod = 'email' | 'microsoft' | 'google' | 'github' | 'windows'

interface LoginProps {
  onLogin: () => void
}

interface AuthResponse {
  email: string
  displayName: string
  role: UserRole
  workspaceId: number
  method: AuthMethod
}

interface ExternalProvidersResponse {
  github: boolean
  microsoft: boolean
  windows: boolean
}

export function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState(localStorage.getItem('timekeeper_authUserEmail') || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [workspaceId] = useState(localStorage.getItem('timekeeper_authWorkspaceId') || '1')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authError, setAuthError] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [providers, setProviders] = useState<ExternalProvidersResponse>({ github: false, microsoft: false, windows: false })

  const getApiBaseUrl = () => {
    const configured = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
    const isViteDevHost =
      window.location.port === '5173' ||
      window.location.port === '5174' ||
      window.location.port === '5175' ||
      window.location.port === '5176'

    if (isViteDevHost) {
      if (!configured) {
        return 'http://localhost:5000'
      }

      if (
        configured.startsWith('/') ||
        configured.replace(/\/$/, '') === window.location.origin.replace(/\/$/, '')
      ) {
        return 'http://localhost:5000'
      }
    }

    if (configured) {
      return configured.replace(/\/$/, '')
    }

    if (isViteDevHost) {
      return 'http://localhost:5000'
    }

    return window.location.origin
  }

  const completeLogin = (
    resolvedEmail: string,
    resolvedRole: UserRole,
    resolvedWorkspaceId: string,
    resolvedMode: AuthMode,
    resolvedMethod: AuthMethod,
    resolvedDisplayName?: string,
  ) => {
    localStorage.setItem('timekeeper_loggedIn', 'true')
    localStorage.setItem('timekeeper_authUserEmail', resolvedEmail)
    localStorage.setItem('timekeeper_authRole', resolvedRole)
    localStorage.setItem('timekeeper_authWorkspaceId', resolvedWorkspaceId)
    localStorage.setItem('timekeeper_authMode', resolvedMode)
    localStorage.setItem('timekeeper_authMethod', resolvedMethod)

    const displayName = resolvedDisplayName?.trim() || fullName.trim()
    if (displayName) {
      localStorage.setItem('timekeeper_authDisplayName', displayName)
    }

    onLogin()
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem('timekeeper_darkMode')
    const shouldUseDarkMode = savedTheme === null ? true : savedTheme === 'true'

    if (savedTheme === null) {
      localStorage.setItem('timekeeper_darkMode', 'true')
    }

    setIsDarkMode(shouldUseDarkMode)
    if (shouldUseDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const authStatus = params.get('auth')
    if (!authStatus) {
      return
    }

    if (authStatus === 'error') {
      setAuthError(params.get('error') || 'External authentication failed.')
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }

    const callbackEmail = params.get('email')
    const callbackRole = params.get('role') as UserRole | null
    const callbackWorkspaceId = params.get('workspaceId')
    const callbackMethod = params.get('method') as AuthMethod | null
    const callbackMode = params.get('mode') as AuthMode | null
    const callbackDisplayName = params.get('displayName') || ''

    if (callbackEmail && callbackRole && callbackWorkspaceId && callbackMethod && callbackMode) {
      completeLogin(
        callbackEmail,
        callbackRole,
        callbackWorkspaceId,
        callbackMode,
        callbackMethod,
        callbackDisplayName,
      )
    } else {
      setAuthError('External login callback is missing required account data.')
    }

    window.history.replaceState({}, document.title, window.location.pathname)
  }, [])

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const response = await fetch('/api/auth/external/providers')
        if (!response.ok) {
          return
        }

        const available = (await response.json()) as ExternalProvidersResponse
        setProviders(available)
      } catch {
        setProviders({ github: false, microsoft: false, windows: false })
      }
    }

    loadProviders()
  }, [])

  const normalizeWorkspaceId = () => {
    const parsedWorkspaceId = parseInt(workspaceId, 10)
    return Number.isFinite(parsedWorkspaceId) && parsedWorkspaceId > 0 ? String(parsedWorkspaceId) : '1'
  }

  const toggleTheme = () => {
    const nextIsDark = !isDarkMode
    setIsDarkMode(nextIsDark)
    localStorage.setItem('timekeeper_darkMode', nextIsDark ? 'true' : 'false')
    if (nextIsDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const handleExternalLogin = async (provider: Exclude<AuthMethod, 'email' | 'google'>) => {
    setAuthError('')
    const normalizedWorkspaceId = normalizeWorkspaceId()

    if (provider === 'github' && !providers.github) {
      setAuthError('GitHub login is not configured on this server yet.')
      return
    }

    if (provider === 'microsoft' && !providers.microsoft) {
      setAuthError('Microsoft login is not configured on this server yet.')
      return
    }

    if (provider === 'windows' && !providers.windows) {
      setAuthError('Windows login is not available on this server environment.')
      return
    }

    setIsSubmitting(true)

    if (provider === 'windows') {
      const returnUrl = `${window.location.origin}${window.location.pathname}`
      const windowsUrl = `${getApiBaseUrl()}/api/auth/windows?mode=${mode}&workspaceId=${normalizedWorkspaceId}&returnUrl=${encodeURIComponent(returnUrl)}`
      window.location.href = windowsUrl
      return
    }

    const returnUrl = `${window.location.origin}${window.location.pathname}`
    const externalUrl = `${getApiBaseUrl()}/api/auth/external/${provider}?mode=${mode}&workspaceId=${normalizedWorkspaceId}&returnUrl=${encodeURIComponent(returnUrl)}`
    window.location.href = externalUrl
  }

  const handleEmailSubmit = async () => {
    setAuthError('')

    const normalizedWorkspaceId = normalizeWorkspaceId()
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      setAuthError('Email is required.')
      return
    }

    if (mode === 'signup' && !fullName.trim()) {
      setAuthError('Full name is required to create an account.')
      return
    }

    if (!password) {
      setAuthError('Password is required.')
      return
    }

    if (mode === 'signup') {
      if (password.length < 8) {
        setAuthError('Password must be at least 8 characters.')
        return
      }

      if (password !== confirmPassword) {
        setAuthError('Passwords do not match.')
        return
      }
    }

    setIsSubmitting(true)

    try {
      const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login'
      const payload = mode === 'signup'
        ? {
            displayName: fullName.trim(),
            email: normalizedEmail,
            password,
            workspaceId: parseInt(normalizedWorkspaceId, 10),
          }
        : {
            email: normalizedEmail,
            password,
            workspaceId: parseInt(normalizedWorkspaceId, 10),
          }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Authentication failed.')
      }

      const auth = (await response.json()) as AuthResponse
      completeLogin(
        auth.email,
        auth.role,
        String(auth.workspaceId),
        mode,
        auth.method,
        auth.displayName,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed.'
      setAuthError(message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute right-4 top-4">
        <Button type="button" variant="outline" size="icon" onClick={toggleTheme}>
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 p-6 md:grid-cols-2 md:gap-8 md:p-10">
        <div className="hidden rounded-lg border bg-card p-8 md:flex md:flex-col md:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Timekeeper</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Track work with confidence</h1>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              Modern sign-in with Microsoft, GitHub, Windows, or email/password for secure team time tracking.
            </p>
          </div>

          <div className="space-y-3 rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Included in this environment</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Shared customers, projects, and tasks</li>
              <li>Private time entries and workdays per user</li>
              <li>Admin user management and account controls</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <Card className="w-full max-w-xl">
            <CardHeader>
              <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
                <Button
                  type="button"
                  variant={mode === 'signin' ? 'default' : 'ghost'}
                  onClick={() => setMode('signin')}
                  className="w-full"
                >
                  Log in
                </Button>
                <Button
                  type="button"
                  variant={mode === 'signup' ? 'default' : 'ghost'}
                  onClick={() => setMode('signup')}
                  className="w-full"
                >
                  Create account
                </Button>
              </div>

              <CardTitle className="pt-2">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</CardTitle>
              <CardDescription>
                {mode === 'signin'
                  ? 'Choose a login method to continue'
                  : 'Use your preferred provider or create an email/password account'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleExternalLogin('microsoft')}
                  disabled={!providers.microsoft || isSubmitting}
                >
                  Microsoft
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleExternalLogin('github')}
                  disabled={!providers.github || isSubmitting}
                >
                  GitHub
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleExternalLogin('windows')}
                  disabled={!providers.windows || isSubmitting}
                >
                  Windows
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                </div>
              </div>

              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="loginFullName">Full name</Label>
                  <Input
                    id="loginFullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Alex Johnson"
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="loginEmail">Email</Label>
                <Input
                  id="loginEmail"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="loginPassword">Password</Label>
                <Input
                  id="loginPassword"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={mode === 'signup' ? 'Minimum 8 characters' : 'Enter your password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
              </div>

              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="loginConfirmPassword">Confirm password</Label>
                  <Input
                    id="loginConfirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                  />
                </div>
              )}

              <Button onClick={handleEmailSubmit} disabled={isSubmitting} className="w-full">
                {mode === 'signin' ? 'Log in with Email' : 'Create account'}
              </Button>

              {authError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {authError}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Password reset is available only for email login accounts. External provider accounts use provider-managed credentials.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
