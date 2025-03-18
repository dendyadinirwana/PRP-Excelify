"use client"

import { useEffect, useRef } from "react"
import { Coffee } from "lucide-react"

interface DonateButtonProps {
  className?: string
}

export const DonateButton = ({ className = "" }: DonateButtonProps) => {
  const buttonRef = useRef<HTMLDivElement>(null)
  const scriptLoaded = useRef(false)

  useEffect(() => {
    // Only load the script once
    if (scriptLoaded.current) return

    // Load the Trakteer script
    const script = document.createElement("script")
    script.src = "https://edge-cdn.trakteer.id/js/trbtn-overlay.min.js?v=24-01-2025"
    script.async = true
    script.onload = () => {
      // Initialize the Trakteer button after script loads
      const initScript = document.createElement("script")
      initScript.type = "text/javascript"
      initScript.className = "troverlay"
      initScript.text = `
        (function() {
          var trbtnId = trbtnOverlay.init(
            'Buy me a Coffee',
            '#FFFFFF',
            'https://trakteer.id/nirwna/tip/embed/modal',
            'https://trakteer.id/images/mix/coffee.png',
            '44',
            'inline'
          );
          trbtnOverlay.draw(trbtnId);
        })();
      `

      // Append the initialization script to the button container
      if (buttonRef.current) {
        buttonRef.current.appendChild(initScript)
      }
    }

    // Append the main script to the document
    document.body.appendChild(script)
    scriptLoaded.current = true

    // Cleanup function
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  return (
    <div className={`donate-button-container ${className}`}>
      {/* This div will be populated by the Trakteer script */}
      <div ref={buttonRef}></div>

      {/* Fallback button in case the script fails to load */}
      <button
        className="relative px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full font-medium flex items-center gap-2 overflow-hidden transition-all duration-300 hover:shadow-lg group"
        onClick={() => {
          // Open the Trakteer page in a new tab as fallback
          window.open("https://trakteer.id/nirwna/tip", "_blank")
        }}
      >
        <span className="relative z-10 flex items-center gap-2">
          <Coffee className="h-4 w-4" />
          Donate
        </span>
        <span className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
      </button>
    </div>
  )
}

