import { useEffect, useState, useRef } from 'react'

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
  const intervalIdRef = useRef<number | undefined>()
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    const updateInterval = (isConnected: boolean) => {
      if (intervalIdRef.current !== undefined) {
        clearInterval(intervalIdRef.current)
      }
      const interval = isConnected ? CHECK_INTERVAL_CONNECTED : CHECK_INTERVAL_DISCONNECTED
      intervalIdRef.current = window.setInterval(checkConnection, interval)
    }

    const checkConnection = async () => {
      let timeoutId: number | undefined
      try {
        const controller = new AbortController()
        timeoutId = window.setTimeout(() => controller.abort(), TIMEOUT_MS)

        const response = await fetch('/api/health', {
          signal: controller.signal,
        })

        if (isMountedRef.current) {
          const newIsConnected = response.ok
          setStatus((prevStatus) => {
            // Only update interval if connection state changed
            if (prevStatus.isConnected !== newIsConnected) {
              updateInterval(newIsConnected)
            }
            return {
              isConnected: newIsConnected,
              lastChecked: new Date(),
            }
          })
        }
      } catch (error) {
        // Network error, timeout, or aborted request
        if (isMountedRef.current) {
          setStatus((prevStatus) => {
            // Only update interval if connection state changed
            if (prevStatus.isConnected !== false) {
              updateInterval(false)
            }
            return {
              isConnected: false,
              lastChecked: new Date(),
            }
          })
        }
      } finally {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId)
        }
      }
    }

    // Initial check
    checkConnection().then(() => {
      // Set up periodic checking after initial check completes
      // This ensures the interval matches the actual connection state
      if (isMountedRef.current && intervalIdRef.current === undefined) {
        // Use the current status to determine initial interval
        setStatus((currentStatus) => {
          const interval = currentStatus.isConnected 
            ? CHECK_INTERVAL_CONNECTED 
            : CHECK_INTERVAL_DISCONNECTED
          intervalIdRef.current = window.setInterval(checkConnection, interval)
          return currentStatus
        })
      }
    })

    return () => {
      isMountedRef.current = false
      if (intervalIdRef.current !== undefined) {
        clearInterval(intervalIdRef.current)
        intervalIdRef.current = undefined
      }
    }
  }, [])

  return status
}
