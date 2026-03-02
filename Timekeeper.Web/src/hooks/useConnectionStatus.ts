import { useEffect, useState } from 'react'

interface ConnectionStatus {
  isConnected: boolean
  lastChecked: Date | null
}

const CHECK_INTERVAL = 10000 // 10 seconds
const TIMEOUT_MS = 5000 // 5 seconds timeout for health check

/**
 * Hook to monitor connection status with the API server
 * Performs periodic health checks and reports connection state
 */
export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: true, // Assume connected initially
    lastChecked: null,
  })

  useEffect(() => {
    let isMounted = true

    const checkConnection = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

        const response = await fetch('/api/health', {
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (isMounted) {
          setStatus({
            isConnected: response.ok,
            lastChecked: new Date(),
          })
        }
      } catch (error) {
        // Network error, timeout, or aborted request
        if (isMounted) {
          setStatus({
            isConnected: false,
            lastChecked: new Date(),
          })
        }
      }
    }

    // Initial check
    checkConnection()

    // Set up periodic checking
    const interval = setInterval(checkConnection, CHECK_INTERVAL)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  return status
}
