import { useEffect, useState } from 'react'

interface ConnectionStatus {
  isConnected: boolean
  lastChecked: Date | null
}

const CHECK_INTERVAL_CONNECTED = 10000 // 10 seconds when connected
const CHECK_INTERVAL_DISCONNECTED = 3000 // 3 seconds when disconnected (faster recovery)
const TIMEOUT_MS = 5000 // 5 seconds timeout for health check

/**
 * Hook to monitor connection status with the API server
 * Performs periodic health checks and reports connection state
 * Uses faster polling when disconnected for quicker reconnection detection
 */
export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: true, // Assume connected initially
    lastChecked: null,
  })

  useEffect(() => {
    let isMounted = true
    let intervalId: number | undefined

    const checkConnection = async () => {
      let timeoutId: number | undefined
      try {
        const controller = new AbortController()
        timeoutId = window.setTimeout(() => controller.abort(), TIMEOUT_MS)

        const response = await fetch('/api/health', {
          signal: controller.signal,
        })

        if (isMounted) {
          const newIsConnected = response.ok
          setStatus({
            isConnected: newIsConnected,
            lastChecked: new Date(),
          })

          // Adjust polling interval based on connection state
          if (intervalId !== undefined) {
            clearInterval(intervalId)
            intervalId = window.setInterval(
              checkConnection,
              newIsConnected ? CHECK_INTERVAL_CONNECTED : CHECK_INTERVAL_DISCONNECTED
            )
          }
        }
      } catch (error) {
        // Network error, timeout, or aborted request
        if (isMounted) {
          setStatus({
            isConnected: false,
            lastChecked: new Date(),
          })

          // Adjust polling interval to check more frequently when disconnected
          if (intervalId !== undefined) {
            clearInterval(intervalId)
            intervalId = window.setInterval(checkConnection, CHECK_INTERVAL_DISCONNECTED)
          }
        }
      } finally {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId)
        }
      }
    }

    // Initial check
    checkConnection()

    // Set up periodic checking with initial interval
    intervalId = window.setInterval(checkConnection, CHECK_INTERVAL_CONNECTED)

    return () => {
      isMounted = false
      if (intervalId !== undefined) {
        clearInterval(intervalId)
      }
    }
  }, [])

  return status
}
