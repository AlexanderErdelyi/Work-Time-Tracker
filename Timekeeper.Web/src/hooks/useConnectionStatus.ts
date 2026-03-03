import { useEffect, useState, useRef } from 'react'

interface ConnectionStatus {
  isConnected: boolean
  lastChecked: Date | null
}

const CHECK_INTERVAL_CONNECTED = 5000 // 5 seconds when connected
const CHECK_INTERVAL_DISCONNECTED = 3000 // 3 seconds when disconnected (faster recovery)
const TIMEOUT_MS = 3000 // 3 seconds timeout for health check

/**
 * Hook to monitor connection status with the API server
 * Performs periodic health checks and reports connection state
 * Uses faster polling when disconnected for quicker reconnection detection
 */
export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: true, // Start optimistically, will be checked immediately
    lastChecked: null,
  })
  const intervalIdRef = useRef<number | undefined>()
  const isCheckingRef = useRef(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    const checkConnection = async () => {
      // Prevent concurrent checks
      if (isCheckingRef.current) return
      isCheckingRef.current = true

      let timeoutId: number | undefined
      let newIsConnected = false

      try {
        const controller = new AbortController()
        timeoutId = window.setTimeout(() => controller.abort(), TIMEOUT_MS)

        const response = await fetch('/api/health', {
          signal: controller.signal,
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' },
        })

        newIsConnected = response.ok
      } catch (error) {
        // Network error, timeout, or aborted request
        newIsConnected = false
      } finally {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId)
        }
        isCheckingRef.current = false
      }

      if (isMountedRef.current) {
        setStatus((prevStatus) => {
          // Only update interval if connection state changed
          if (prevStatus.isConnected !== newIsConnected) {
            if (intervalIdRef.current !== undefined) {
              clearInterval(intervalIdRef.current)
            }
            const interval = newIsConnected
              ? CHECK_INTERVAL_CONNECTED
              : CHECK_INTERVAL_DISCONNECTED
            intervalIdRef.current = window.setInterval(checkConnection, interval)
          }
          return {
            isConnected: newIsConnected,
            lastChecked: new Date(),
          }
        })
      }
    }

    // Initial check
    checkConnection()

    // Set up periodic checking with initial interval
    intervalIdRef.current = window.setInterval(checkConnection, CHECK_INTERVAL_CONNECTED)

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
