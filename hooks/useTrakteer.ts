"use client"

import { useEffect, useState } from "react"

export function useTrakteer() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Check if the script is already loaded
    if (window.trbtnOverlay) {
      setIsLoaded(true)
      return
    }

    // Create and load the script
    const script = document.createElement("script")
    script.src = "https://edge-cdn.trakteer.id/js/trbtn-overlay.min.js?v=24-01-2025"
    script.async = true

    // Handle script load success
    script.onload = () => {
      setIsLoaded(true)
    }

    // Handle script load error
    script.onerror = (e) => {
      setError(new Error("Failed to load Trakteer script"))
    }

    // Add the script to the document
    document.body.appendChild(script)

    // Cleanup function
    return () => {
      // Only remove the script if we added it
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  return { isLoaded, error }
}

