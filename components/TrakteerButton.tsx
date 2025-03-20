"use client"

import { useEffect, useRef, useState } from "react"
import { IceCream } from "lucide-react"
import { useTrakteer } from "@/hooks/useTrakteer"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from "@/components/ui/dialog"

interface TrakteerButtonProps {
  className?: string
}

const buttonStyles = {
  container: `fixed bottom-4 right-4 z-40`,
  button: `relative px-4 py-2 bg-[#1F2A37] text-white dark:bg-[white] dark:text-[#1F2A37] rounded-full font-medium flex items-center gap-2 overflow-hidden transition-all duration-300 hover:shadow-lg`,
  icon: `h-4 w-4`,
  modal: `fixed inset-0 z-50 bg-black/60 backdrop-blur-md`
}

export const TrakteerButton = ({ className = "" }: TrakteerButtonProps) => {
  const { isLoaded, error } = useTrakteer()
  const buttonContainerRef = useRef<HTMLDivElement>(null)
  const trakteerInitialized = useRef(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Only initialize once and only after the script is loaded
    if (isLoaded && !trakteerInitialized.current && buttonContainerRef.current) {
      try {
        // Initialize the Trakteer button
        const trbtnId = (window as any).trbtnOverlay.init(
          "Buy me Ice Cream",
          "#000000",
          "https://trakteer.id/nirwna/tip/embed/modal",
          "https://trakteer.id/images/mix/ice-cream.png",
          "44",
          "floating-right",
        )

        // Draw the button in our container
        ;(window as any).trbtnOverlay.draw(trbtnId, buttonContainerRef.current)

        trakteerInitialized.current = true
      } catch (err) {
        console.error("Failed to initialize Trakteer button:", err)
      }
    }
  }, [isLoaded])

  const handleButtonClick = () => {
    setIsOpen(true)
  }

  const CustomButton = () => (
    <motion.button
      className={`${buttonStyles.button} ${className}`}
      onClick={handleButtonClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="relative z-10 flex items-center gap-2">
        <IceCream className={buttonStyles.icon} />
        Buy me ice cream
      </span>
    </motion.button>
  )

  return (
    <>
      <div className={`trakteer-button-container ${buttonStyles.container} ${className}`}>
        {error || !isLoaded || !trakteerInitialized.current ? (
          <CustomButton />
        ) : (
          <div ref={buttonContainerRef} />
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-all duration-300 ease-in-out"
            />
            <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[90vh] max-h-[760px] w-[90vw] max-w-xl rounded-xl p-0 shadow-xl bg-background/95 border-none overflow-hidden">
              <DialogTitle className="sr-only">Trakteer Donation Form</DialogTitle>
              <DialogDescription className="sr-only">
                Form donasi untuk memberikan dukungan melalui platform Trakteer. Anda dapat memilih nominal dan metode pembayaran yang tersedia.
              </DialogDescription>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="h-full w-full"
              >
                <iframe
                  src="https://trakteer.id/nirwna/tip/embed/modal"
                  className="h-full w-full"
                  frameBorder="0"
                  title="Trakteer donation form"
                  aria-label="Trakteer donation form"
                />
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  )
}

