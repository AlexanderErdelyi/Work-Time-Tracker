import type { AuthResponseDto, WindowsCredentialsAuthRequest } from '../types'

export const authApi = {
  windowsCredentialsSignIn: async (payload: WindowsCredentialsAuthRequest) => {
    const response = await fetch('/api/auth/windows-credentials/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || 'Windows credentials sign-in failed.')
    }

    return response.json() as Promise<AuthResponseDto>
  },

  windowsCredentialsSignUp: async (payload: WindowsCredentialsAuthRequest) => {
    const response = await fetch('/api/auth/windows-credentials/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || 'Windows credentials sign-up failed.')
    }

    return response.json() as Promise<AuthResponseDto>
  },
}
