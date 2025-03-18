"use client"

import { useEffect, useRef } from "react"
import { Coffee } from "lucide-react"
import { useTrakteer } from "@/hooks/useTrakteer"
import { motion } from "framer-motion"

interface TrakteerButtonProps {
  className?: string
}

export const TrakteerButton = ({ className = "" }: TrakteerButtonProps) => {
  const { isLoaded, error } = useTrakteer()
  const buttonContainerRef = useRef<HTMLDivElement>(null)
  const trakteerInitialized = useRef(false)

  useEffect(() => {
    // Only initialize once and only after the script is loaded
    if (isLoaded && !trakteerInitialized.current && buttonContainerRef.current) {
      try {
        // Initialize the Trakteer button
        const trbtnId = (window as any).trbtnOverlay.init(
          "Buy me a Coffee",
          "#FFFFFF",
          "https://trakteer.id/nirwna/tip/embed/modal",
          "https://trakteer.id/images/mix/coffee.png",
          "44",
          "custom",
        )

        // Draw the button in our container
        ;(window as any).trbtnOverlay.draw(trbtnId, buttonContainerRef.current)

        trakteerInitialized.current = true
      } catch (err) {
        console.error("Failed to initialize Trakteer button:", err)
      }
    }
  }, [isLoaded])

  // If the script failed to load or initialize, show our custom button
  if (error || !isLoaded) {
    return (
      <motion.button
        className={`relative px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full font-medium flex items-center gap-2 overflow-hidden transition-all duration-300 hover:shadow-lg ${className}`}
        onClick={() => window.open("https://trakteer.id/nirwna/tip", "_blank")}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="relative z-10 flex items-center gap-2">
          <Coffee className="h-4 w-4" />
          Donate
        </span>
      </motion.button>
    )
  }

  return (
    <div className={`trakteer-button-container ${className}`} ref={buttonContainerRef}>
      {/* This will be populated by the Trakteer script */}
      {/* Fallback in case the script doesn't render properly */}
      {!trakteerInitialized.current && (
        <motion.button
          className="relative px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full font-medium flex items-center gap-2 overflow-hidden transition-all duration-300 hover:shadow-lg"
          onClick={() => window.open("https://trakteer.id/nirwna/tip", "_blank")}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="relative z-10 flex items-center gap-2">
            <Coffee className="h-4 w-4" />
            Donate
          </span>
        </motion.button>
      )}
    </div>
  )
}

