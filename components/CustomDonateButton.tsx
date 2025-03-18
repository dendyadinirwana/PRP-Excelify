"use client"

import { useState } from "react"
import { Coffee } from "lucide-react"
import { motion } from "framer-motion"
import { DonationModal } from "./DonationModal"

interface CustomDonateButtonProps {
  className?: string
}

export const CustomDonateButton = ({ className = "" }: CustomDonateButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <motion.button
        className={`relative px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full font-medium flex items-center gap-2 overflow-hidden transition-all duration-300 hover:shadow-lg ${className}`}
        onClick={() => setIsModalOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="relative z-10 flex items-center gap-2">
          <Coffee className="h-4 w-4" />
          Donate
        </span>
      </motion.button>

      <DonationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}

