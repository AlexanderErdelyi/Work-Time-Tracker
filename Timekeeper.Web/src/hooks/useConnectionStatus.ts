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
    isConnected: true, // Start optimistically, will be checked immediately
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

    const checkConnection = async (): Promise<boolean> => {
      let timeoutId: number | undefined
      let newIsConnected = false
      
      try {
        const controller = new AbortController()
        timeoutId = window.setTimeout(() => controller.abort(), TIMEOUT_MS)

        const response = await fetch('/api/health', {
          signal: controller.signal,
        })

        newIsConnected = response.ok
      } catch (error) {
        // Network error, timeout, or aborted request
        newIsConnected = false
      } finally {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId)
        }
      }

      if (isMountedRef.current) {
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

      return newIsConnected
    }

    // Initial check and setup
    checkConnection()
      .then((initialIsConnected) => {
        // Set up periodic checking with interval matching the actual connection state
        if (isMountedRef.current && intervalIdRef.current === undefined) {
          const interval = initialIsConnected 
            ? CHECK_INTERVAL_CONNECTED 
            : CHECK_INTERVAL_DISCONNECTED
          intervalIdRef.current = window.setInterval(checkConnection, interval)
        }
      })
      .catch(() => {
        // Handle any unexpected errors during initial setup
        // The checkConnection function already handles errors internally,
        // but this prevents unhandled promise rejections
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
