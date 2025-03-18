"use client"

import { motion } from "framer-motion"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

interface AnimatedLogoProps {
  className?: string
}

export const AnimatedLogo = ({ className = "" }: AnimatedLogoProps) => {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const isDark = theme === "dark"

  // Logo animation variants
  const logoVariants = {
    initial: { opacity: 0, y: -10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
    hover: {
      scale: 1.05,
      transition: {
        duration: 0.3,
        ease: "easeInOut",
      },
    },
  }

  // Path animation variants
  const pathVariants = {
    initial: { pathLength: 0 },
    animate: (i: number) => ({
      pathLength: 1,
      transition: {
        duration: 1.2,
        delay: 0.2 + i * 0.1,
        ease: "easeInOut",
      },
    }),
  }

  return (
    <motion.div className={`relative ${className}`} initial="initial" animate="animate" whileHover="hover">
      <motion.svg
        width="84"
        height="52"
        viewBox="0 0 84 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-auto h-10"
      >
        <g clipPath="url(#clip0_22_680)">
          <motion.path
            d="M25.1305 45.3492L11.9871 32.2058V12.4908H25.7279H26.3254L26.4199 11.2959L27.6148 12.4908H41.8585V11.2959L43.0533 12.4908H57.3915V11.2959L58.5864 12.4908L91.4449 45.3492H25.1305Z"
            fill={isDark ? "#1f2a37" : "black"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          />
          <motion.path
            d="M40.6636 45.3492L27.5202 32.2058V12.4908H41.261H41.8585L41.9151 11.2959L43.1099 12.4908L57.3915 12.4908V11.2959L58.5864 12.4908L70.2362 24.1406V45.3492H40.6636Z"
            fill={isDark ? "#1f2a37" : "black"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          />
          <motion.path
            d="M56.1967 45.3492L43.0533 32.2058V12.4908H56.7941H57.3916L57.4838 11.2959L58.6786 12.4908L63.7567 17.5689V45.3492H56.1967Z"
            fill={isDark ? "#1f2a37" : "black"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          />
          <motion.path
            d="M26.432 25.8474V11.2959H12.7132L11.8805 12.1285V32.0837H20.1956V25.8474H26.432Z"
            fill={isDark ? "#374151" : "#DDDCD2"}
            custom={0}
            variants={pathVariants}
            initial="initial"
            animate="animate"
          />
          <motion.path
            d="M57.4982 25.8474V11.2959H43.7793L42.9467 12.1285V32.0837H51.2618V25.8474H57.4982Z"
            fill={isDark ? "#374151" : "#DDDCD2"}
            custom={1}
            variants={pathVariants}
            initial="initial"
            animate="animate"
          />
          <motion.path
            d="M27.3761 32.0837V12.1285L28.2087 11.2959H41.9276V25.8474H39.2251L42.0315 32.0837H35.1715H34.7038H27.3761Z"
            fill={isDark ? "#374151" : "#DDDCD2"}
            custom={2}
            variants={pathVariants}
            initial="initial"
            animate="animate"
          />
        </g>
        <g filter="url(#filter0_d_22_680)">
          <mask
            id="mask0_22_680"
            maskUnits="userSpaceOnUse"
            x="11"
            y="12"
            width="47"
            height="21"
            style={{ maskType: "alpha" }}
          >
            <path
              d="M51.2618 26H50.6644V26.5974V32.2363H43.5441V13.126L44.0268 12.6433H56.9008V26H51.2618Z"
              fill="#C8FF32"
              stroke="#A2D518"
              strokeWidth="1.19485"
            />
            <path
              d="M28.4561 12.6433H41.3301V26H39.2251H38.3011L38.6803 26.8425L41.1075 32.2363H35.1714H34.7037H27.9734V13.126L28.4561 12.6433Z"
              fill="#C8FF32"
              stroke="#A2D518"
              strokeWidth="1.19485"
            />
            <path
              d="M20.1957 26H19.5982V26.5974V32.2363H12.478V13.126L12.9606 12.6433H25.8346V26H20.1957Z"
              fill="#C8FF32"
              stroke="#A2D518"
              strokeWidth="1.19485"
            />
          </mask>
          <g mask="url(#mask0_22_680)">
            <motion.path
              d="M57.4981 27.0974H57.9981V26.5974V12.0459V11.5459H57.4981H43.7793H43.5722L43.4258 11.6923L42.5931 12.525L42.4467 12.6714V12.8785V32.8337V33.3337H42.9467H51.2618H51.7618V32.8337V27.0974H57.4981Z"
              stroke={isDark ? "white" : "black"}
              strokeDasharray="0 1"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: 0.8 }}
            />
            <motion.path
              d="M26.876 32.8337V33.3337H27.376H34.7037H35.1714H42.0314H42.8047L42.4873 32.6285L39.9983 27.0974H41.9274H42.4274V26.5974V12.0459V11.5459H41.9274H28.2086H28.0015L27.8551 11.6923L27.0224 12.525L26.876 12.6714V12.8785V32.8337Z"
              stroke={isDark ? "white" : "black"}
              strokeDasharray="0 1"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: 1.0 }}
            />
            <motion.path
              d="M26.432 27.0974H26.932V26.5974V12.0459V11.5459H26.432H12.7132H12.5061L12.3596 11.6923L11.527 12.525L11.3805 12.6714V12.8785V32.8337V33.3337H11.8805H20.1957H20.6957V32.8337V27.0974H26.432Z"
              stroke={isDark ? "white" : "black"}
              strokeDasharray="0 1"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: 1.2 }}
            />
          </g>
        </g>
        <defs>
          <filter
            id="filter0_d_22_680"
            x="-10.4921"
            y="-16.7457"
            width="101.104"
            height="75.8279"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset dy="0.121373" />
            <feGaussianBlur stdDeviation="3.79291" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.07 0" />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_22_680" />
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_22_680" result="shape" />
          </filter>
          <clipPath id="clip0_22_680">
            <rect width="50.7812" height="25.6893" fill="white" transform="translate(11.9871 11.2959)" />
          </clipPath>
        </defs>
      </motion.svg>
    </motion.div>
  )
}

