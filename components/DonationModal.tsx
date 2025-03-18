"use client"

import { useState, useEffect } from "react"
import { Coffee, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface DonationModalProps {
  isOpen: boolean
  onClose: () => void
}

export const DonationModal = ({ isOpen, onClose }: DonationModalProps) => {
  const [iframeLoaded, setIframeLoaded] = useState(false)

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen, onClose])

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }

    return () => {
      document.body.style.overflow = "auto"
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative bg-white dark:bg-[#1f2a37] rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-[#111928] dark:text-white flex items-center gap-2">
                <Coffee className="h-5 w-5 text-orange-500" />
                Support Our Work
              </h3>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                aria-label="Close donation modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative h-[500px]">
              {!iframeLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
                </div>
              )}

              <iframe
                src="https://trakteer.id/nirwna/tip/embed/modal"
                width="100%"
                height="100%"
                frameBorder="0"
                allowTransparency={true}
                onLoad={() => setIframeLoaded(true)}
                className={`${iframeLoaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
              ></iframe>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

