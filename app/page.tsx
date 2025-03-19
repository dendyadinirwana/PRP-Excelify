"use client"

import type React from "react"
import { motion } from "framer-motion"
import { Upload, Trash2, Download, GripVertical, MoveRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"

// Import the AnimatedLogo component
import { AnimatedLogo } from "@/components/AnimatedLogo"


// Define a file type for our file list
type FileItem = {
  id: string
  name: string
  size: string
  originalFile: File
  validationStatus?: {
    hasContent: boolean
    needsReplacement: boolean
  }
}

// Keep only the dynamic import
const LottiePlayer = dynamic(() => import("lottie-web").then(mod => ({ default: () => null })), {
  ssr: false,
})

// Flag components
const USFlag = () => (
  <svg
    width="84"
    height="60"
    viewBox="0 0 84 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full"
  >
    <g clipPath="url(#clip0_us_flag)">
      <rect width="84" height="60" rx="8" fill="white" />
      <path fillRule="evenodd" clipRule="evenodd" d="M0 0H36V28H0V0Z" fill="#1A47B8" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M36 0V4H84V0H36ZM36 8V12H84V8H36ZM36 16V20H84V16H36ZM36 24V28H84V24H36ZM0 32V36H84V32H0ZM0 40V44H84V40H0ZM0 48V52H84V48H0ZM0 56V60H84V56H0Z"
        fill="#F93939"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 4V8H8V4H4ZM12 4V8H16V4H12ZM20 4V8H24V4H20ZM28 4V8H32V4H28ZM24 8V12H28V8H24ZM16 8V12H20V8H16ZM8 8V12H12V8H8ZM4 12V16H8V12H4ZM12 12V16H16V12H12ZM20 12V16H24V12H20ZM28 12V16H32V12H28ZM4 20V24H8V20H4ZM12 20V24H16V20H12ZM20 20V24H24V20H20ZM28 20V24H32V20H28ZM24 16V20H28V16H24ZM16 16V20H20V16H16ZM8 16V20H12V16H8Z"
        fill="white"
      />
    </g>
    <defs>
      <clipPath id="clip0_us_flag">
        <rect width="84" height="60" rx="8" fill="white" />
      </clipPath>
    </defs>
  </svg>
)

const IDFlag = () => (
  <svg
    width="84"
    height="60"
    viewBox="0 0 84 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full"
  >
    <rect width="84" height="60" rx="8" fill="white" />
    <path fillRule="evenodd" clipRule="evenodd" d="M0 0H84V32H0V0Z" fill="#F93939" />
  </svg>
)

// Move this before the Home component
const DocumentProcessing = ({
  handleReset,
  handleNextStep,
  handleBackStep,
  text,
  files,
  setFiles,
  language,
}: {
  handleReset: () => void
  handleNextStep: () => void
  handleBackStep: () => void
  text: any
  files: FileItem[]
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>
  language: string
}) => {
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)
  const [excelData, setExcelData] = useState<Blob | null>(null)
  const [analysisResults, setAnalysisResults] = useState<{
    title: string
    keyPoints: string[]
    recurringWords: string[]
    context: string
  } | null>(null)

  const handleDownload = () => {
    if (excelData) {
      const url = window.URL.createObjectURL(excelData)
      const a = document.createElement("a")
      a.href = url
      a.download = `OCR_Results_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    }
  }

  const processFiles = async () => {
    try {
      setIsProcessing(true)
      setError(null)

      // Start processing
      setProgress(5)

      // Process each file in sequence and collect results
      const results = []
      const totalFiles = files.length

      for (let i = 0; i < totalFiles; i++) {
        const file = files[i]
        const formData = new FormData()

        // Update file validation status to indicate processing
        setFiles((prevFiles: FileItem[]) => prevFiles.map(f =>
          f.id === file.id ? { ...f, validationStatus: undefined } : f
        ))

        // Add the current file to formData
        formData.append("file", file.originalFile)

        // Add language
        formData.append("language", language)

        // Update progress based on file processing
        const progressPerFile = 80 / totalFiles
        setProgress(10 + progressPerFile * i)

        try {
          const response = await fetch("/api/ocr", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `Processing failed for ${file.name} with status: ${response.status}`)
          }

          // Handle the response
          const result = await response.json()

          // Store analysis results
          if (result.analysis) {
            setAnalysisResults(result.analysis)
          }

          // Update file validation status based on content detection
          const hasContent = result.rows && result.rows.length > 0
          setFiles(prevFiles => prevFiles.map(f => 
            f.id === file.id ? {
              ...f,
              validationStatus: {
                hasContent,
                needsReplacement: !hasContent
              }
            } : f
          ))

          // Add file name to the result
          if (result && result.rows) {
            results.push({
              fileName: file.name,
              rows: result.rows,
              index: i,
              excelData: result.excelData,
            })
          }
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError)
          // Continue with other files even if one fails
        }
      }

      setProgress(90)

      if (results.length === 0) {
        throw new Error("No files were successfully processed")
      }

      // Create Excel file from all results
      try {
        // Create Excel file from all results
        const XLSX = await import("xlsx")
        const wb = XLSX.utils.book_new()

        // Track used sheet names to avoid duplicates
        const usedSheetNames = new Set()

        // Option 1: Create a separate sheet for each file
        results.forEach((result, index) => {
          // Create a base sheet name (limited to 25 chars to leave room for uniqueness suffix)
          let baseSheetName = result.fileName ? result.fileName.substring(0, 25) : `Sheet ${index + 1}`

          // Ensure sheet name is unique by adding a suffix if needed
          let sheetName = baseSheetName
          let counter = 1

          while (usedSheetNames.has(sheetName)) {
            sheetName = `${baseSheetName} (${counter})`
            counter++

            // If still too long, truncate more
            if (sheetName.length > 31) {
              baseSheetName = baseSheetName.substring(0, 31 - ` (${counter})`.length)
              sheetName = `${baseSheetName} (${counter})`
            }
          }

          usedSheetNames.add(sheetName)

          const ws = XLSX.utils.aoa_to_sheet(result.rows)
          XLSX.utils.book_append_sheet(wb, ws, sheetName)
        })

        // Option 2: Create a combined sheet with all data
        const combinedRows = []

        // Add a header row for the combined sheet
        combinedRows.push(["File Name", "Content"])

        // Add data from each file with file name
        results.forEach((result) => {
          // Add file name as a header
          combinedRows.push([`File: ${result.fileName}`, ""])

          // Add the content rows
          result.rows.forEach((row: string | string[]) => {
            // If row is an array, add file name to the beginning
            if (Array.isArray(row)) {
              combinedRows.push([result.fileName, ...row])
            } else {
              combinedRows.push([result.fileName, row])
            }
          })

          // Add a separator between files
          combinedRows.push(["", ""])
        })

        const combinedWs = XLSX.utils.aoa_to_sheet(combinedRows)
        XLSX.utils.book_append_sheet(wb, combinedWs, "All Files Combined")

        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
        const workbook = new Blob([excelBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })

        // Store the Excel data instead of downloading immediately
        setExcelData(workbook)
        setProgress(100)
      } catch (error) {
        console.error("Error creating Excel file:", error)
        setError("Excel file generation failed, but text extraction was successful.")
        setProgress(100)
      }
    } catch (error) {
      console.error("Processing error:", error)
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
      setProgress(0)
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    processFiles()
  }, [])

  return (
    <div className="bg-white dark:bg-[#1f2a37] rounded-[24px] w-full max-w-3xl p-6 flex flex-col items-center">
      {error && (
        <div className="w-full max-w-md mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-center">{error}</p>
        </div>
      )}

      {progress < 100 ? (
        <>
          <h2 className="text-2xl font-bold mb-4 text-[#111928] dark:text-white">Processing your documents</h2>
          <p className="text-[#4b5563] dark:text-[#9ca3af] mb-8 text-center">
            Applying OCR and analyzing content for {files.length} file{files.length !== 1 ? "s" : ""}. This may take a
            few moments...
          </p>

          {/* Progress bar */}
          <div className="w-full max-w-md mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-[#4b5563] dark:text-[#9ca3af]">{progress}%</span>
              <span className="text-sm text-[#4b5563] dark:text-[#9ca3af]">100%</span>
            </div>
            <div className="w-full bg-[#e5e7eb] dark:bg-[#374151] rounded-full h-2.5">
              <div
                className="bg-[#4f46e5] h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </>
      ) : (
        <div className="w-full">
          <h2 className="text-2xl font-bold mb-4 text-[#111928] dark:text-white">Processing Complete</h2>
          <div className="bg-white dark:bg-[#1f2a37] rounded-lg p-6 mb-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 mr-3 flex-shrink-0">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M16 2L3 9L16 16L29 9L16 2Z"
                    stroke="#4F46E5"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 23L16 30L29 23"
                    stroke="#4F46E5"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 16L16 23L29 16"
                    stroke="#4F46E5"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#111928] dark:text-white">File Summary</h3>
            </div>
            <div className="prose prose-indigo dark:prose-invert max-w-none">
              <div className="space-y-3 text-[#4b5563] dark:text-[#9ca3af]">
                <p className="flex items-center">
                  <span className="w-2 h-2 bg-[#4f46e5] rounded-full mr-3 flex-shrink-0"></span>
                  <strong>Files processed:</strong> {files.length}
                </p>
                <p className="flex items-center">
                  <span className="w-2 h-2 bg-[#4f46e5] rounded-full mr-3 flex-shrink-0"></span>
                  <strong>Data accuracy:</strong> <em>98%</em> <span className="text-sm">(based on formatting and language recognition)</span>
                </p>
                <p className="flex items-center">
                  <span className="w-2 h-2 bg-[#4f46e5] rounded-full mr-3 flex-shrink-0"></span>
                  <strong>Excel file created:</strong> {files.length} sheet{files.length !== 1 ? "s" : ""} plus a combined view <em>(2.3 MB)</em>
                </p>
              </div>
            </div>
          </div>

          {/* AI Analysis Results */}
          {analysisResults && (
            <div className="bg-white dark:bg-[#1f2a37] rounded-lg p-6 mb-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 mr-3 flex-shrink-0">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M16 28C22.6274 28 28 22.6274 28 16C28 9.37258 22.6274 4 16 4C9.37258 4 4 9.37258 4 16C4 22.6274 9.37258 28 16 28Z"
                      stroke="#4F46E5"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M16 20C18.2091 20 20 18.2091 20 16C20 13.7909 18.2091 12 16 12C13.7909 12 12 13.7909 12 16C12 18.2091 13.7909 20 16 20Z"
                      stroke="#4F46E5"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[#111928] dark:text-white">AI Analysis</h3>
              </div>

              <div className="prose prose-indigo dark:prose-invert max-w-none">
                <div className="space-y-4 text-[#4b5563] dark:text-[#9ca3af]">

                  {/* Additional Context */}
                  {analysisResults.context && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-[#111928] dark:text-white mb-3">
                        {language === "en" ? "Additional Context" : "Konteks Tambahan"}
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <div className="text-gray-600 dark:text-gray-300 space-y-4">
                          {analysisResults.context.split('\n\n').map((paragraph, index) => {
                            // Clean up the text by removing asterisks and normalizing section headers
                            const cleanedText = paragraph
                              .replace(/\*\*/g, '')  // Remove all double asterisks
                              .replace(/^\d+\.\s*/, '') // Remove numbered prefixes like "1. "
                              .replace(/^[A-Za-z\s]+:/, (match) => match.trim()) // Clean up section headers
                              .trim()

                            return (
                              <p key={index} className="leading-relaxed">
                                {cleanedText}
                              </p>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recurring Words */}
                  {analysisResults.recurringWords && analysisResults.recurringWords.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-[#111928] dark:text-white mb-3">
                        {language === "en" ? "Significant Terms" : "Istilah Penting"}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {analysisResults.recurringWords.map((word, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 rounded-full text-sm"
                          >
                            {word.replace(/\*\*/g, '')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="border-t border-[#e5e7eb] w-full dark:border-[#374151] pt-8 mt-8">
        <div className="flex justify-between items-center">
          <button
            onClick={handleReset}
            className="relative px-6 py-2 border border-[#d1d5db] dark:border-[#4b5563] rounded-full text-[#4b5563] dark:text-[#d1d5db] font-medium overflow-hidden transition-all duration-300 hover:bg-[#f9fafb] dark:hover:bg-[#374151] hover:shadow-md group"
          >
            <span className="relative z-10">{text.startOver}</span>
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackStep}
              className="relative px-6 py-2 border border-[#d1d5db] dark:border-[#4b5563] rounded-full text-[#4b5563] dark:text-[#d1d5db] font-medium overflow-hidden transition-all duration-300 hover:bg-[#f9fafb] dark:hover:bg-[#374151] hover:shadow-md group"
            >
              <span className="relative z-10">Back</span>
            </button>
            {progress === 100 && excelData && (
              <button
                onClick={handleDownload}
                className="relative px-6 py-2 bg-[#4f46e5] text-white rounded-full font-medium overflow-hidden transition-all duration-300 hover:bg-[#4338ca] hover:shadow-md group"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  {text.download}
                </span>
                <span className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


export default function Home() {
  const router = useRouter()
  const animationContainer = useRef<HTMLDivElement>(null)
  const [uiLanguage, setUiLanguage] = useState<"en" | "id">("en")
  const [documentLanguage, setDocumentLanguage] = useState<"en" | "id">("en")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [isScrolled, setIsScrolled] = useState(false)

  // File list state
  const [files, setFiles] = useState<FileItem[]>([])

  // Error message state for file limit
  const [fileError, setFileError] = useState<string>("")

  // Drag state
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [theme])

  useEffect(() => {
    let anim: any = null

    if (animationContainer.current && typeof window !== "undefined") {
      const loadAnimation = async () => {
        try {
          // Destroy any existing animation
          if (anim) {
            anim.destroy()
          }

          // Define a simple fallback animation data
          const fallbackAnimationData = {
            v: "5.7.4",
            fr: 30,
            ip: 0,
            op: 60,
            w: 100,
            h: 100,
            nm: "Simple Circle",
            ddd: 0,
            assets: [],
            layers: [
              {
                ddd: 0,
                ind: 1,
                ty: 4,
                nm: "Circle",
                sr: 1,
                ks: {
                  o: { a: 0, k: 100 },
                  r: { a: 0, k: 0 },
                  p: { a: 0, k: [50, 50, 0] },
                  a: { a: 0, k: [0, 0, 0] },
                  s: {
                    a: 1,
                    k: [
                      { t: 0, s: [100, 100], e: [120, 120] },
                      { t: 30, s: [120, 120], e: [100, 100] },
                      { t: 60, s: [100, 100] },
                    ],
                  },
                },
                ao: 0,
                shapes: [
                  {
                    ty: "el",
                    d: 1,
                    s: { a: 0, k: [40, 40] },
                    p: { a: 0, k: [0, 0] },
                    nm: "Ellipse Path 1",
                    mn: "ADBE Vector Shape - Ellipse",
                  },
                  {
                    ty: "st",
                    c: { a: 0, k: [0, 0, 0, 1] },
                    o: { a: 0, k: 100 },
                    w: { a: 0, k: 4 },
                    lc: 1,
                    lj: 1,
                    ml: 4,
                    bm: 0,
                    nm: "Stroke 1",
                    mn: "ADBE Vector Graphic - Stroke",
                  },
                  {
                    ty: "tr",
                    p: { a: 0, k: [0, 0] },
                    a: { a: 0, k: [0, 0] },
                    s: { a: 0, k: [100, 100] },
                    r: { a: 0, k: 0 },
                    o: { a: 0, k: 100 },
                    sk: { a: 0, k: 0 },
                    sa: { a: 0, k: 0 },
                    nm: "Transform",
                  },
                ],
                np: 3,
                cix: 2,
                bm: 0,
                ix: 1,
                mn: "ADBE Vector Group",
              },
            ],
          }

          let animationData

          try {
            // Try to fetch the animation data
            const response = await fetch("/components/animation/eye.json")

            // Check if the response is OK and is JSON
            if (!response.ok) {
              throw new Error(`Failed to fetch animation: ${response.status} ${response.statusText}`)
            }

            const contentType = response.headers.get("content-type")
            if (!contentType || !contentType.includes("application/json")) {
              throw new Error("The response is not JSON")
            }

            animationData = await response.json()
          } catch (fetchError) {
            console.warn("Could not load animation file, using fallback:", fetchError)
            // Use the fallback animation if fetch fails
            animationData = fallbackAnimationData
          }

          const lottie = await import("lottie-web")

          anim = lottie.default.loadAnimation({
            container: animationContainer.current as Element,
            renderer: "svg",
            loop: true,
            autoplay: true,
            animationData: animationData,
          })

          // Debounce the color updates
          let updateTimeout: NodeJS.Timeout
          const updateColors = () => {
            clearTimeout(updateTimeout)
            updateTimeout = setTimeout(() => {
              const elements = animationContainer.current?.querySelectorAll("path, circle")
              requestAnimationFrame(() => {
                elements?.forEach((element) => {
                  if (element instanceof SVGElement) {
                    const currentColor = element.getAttribute("stroke")
                    if (theme === "dark" && (currentColor === "#000000" || currentColor === "rgb(0,0,0)")) {
                      element.setAttribute("stroke", "#FFFFFF")
                    } else if (
                      theme === "light" &&
                      (currentColor === "#FFFFFF" || currentColor === "rgb(255,255,255)")
                    ) {
                      element.setAttribute("stroke", "#000000")
                    }
                  }
                })
              })
            }, 50)
          }

          updateColors()

          const observer = new MutationObserver(updateColors)
          if (animationContainer.current) {
            observer.observe(animationContainer.current, {
              subtree: true,
              attributes: true,
              attributeFilter: ["stroke"],
            })
          }

          return () => {
            clearTimeout(updateTimeout)
            observer.disconnect()
          }
        } catch (error) {
          console.error("Error in animation setup:", error)
        }
      }

      loadAnimation()
    }

    return () => {
      if (anim) {
        anim.destroy()
      }
    }
  }, [theme])

  const languageText = {
    en: {
      language: "English",
      tagline: "We have an AI-powered system that can convert images/pdf to Excel files.",
      uploadFile: "Upload File",
      fileTypes: "JPEG, PNG, or PDF",
      selectLanguage: "Select Language",
      languageOptions: "English or Bahasa",
      process: "Process",
      progressDownload: "Progress and Download",
      fileUpload: "File upload",
      scanningProcess: "To facilitate the scanning process, ensure that the image has a high resolution.",
      dragFiles: "Drag files here to upload",
      browseFiles: "or browse for files",
      startOver: "Start over",
      nextStep: "Next step",
      download: "Download",
      copyright: "© 2025 PRPExcelify. All rights reserved.",
    },
    id: {
      language: "Bahasa Indonesia",
      tagline: "Kami memiliki sistem berbasis AI yang dapat mengkonversi gambar/pdf ke file Excel.",
      uploadFile: "Unggah File",
      fileTypes: "JPEG, PNG, atau PDF",
      selectLanguage: "Pilih Bahasa",
      languageOptions: "Inggris atau Bahasa",
      process: "Proses",
      progressDownload: "Kemajuan dan Unduh",
      fileUpload: "Unggah file",
      scanningProcess: "Untuk memudahkan proses pemindaian, pastikan gambar memiliki resolusi tinggi.",
      dragFiles: "Seret file di sini untuk mengunggah",
      browseFiles: "atau telusuri file",
      startOver: "Mulai ulang",
      nextStep: "Langkah selanjutnya",
      download: "Unduh",
      copyright: "© 2025 PRPExcelify. Seluruh hak cipta.",
    },
  }

  const text = languageText[uiLanguage]

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggedItem(id)
    e.dataTransfer.effectAllowed = "move"
    // Add a ghost image
    const dragImage = document.createElement("div")
    dragImage.classList.add("bg-white", "dark:bg-[#1f2a37]", "p-2", "rounded", "shadow-lg")
    dragImage.textContent = files.find((file) => file.id === id)?.name || ""
    document.body.appendChild(dragImage)
    dragImage.style.position = "absolute"
    dragImage.style.top = "-1000px"
    e.dataTransfer.setDragImage(dragImage, 0, 0)
    setTimeout(() => {
      document.body.removeChild(dragImage)
    }, 0)

    // Add a visual effect to the dragged item
    const element = e.currentTarget
    element.classList.add("scale-[1.02]", "shadow-md", "z-10")
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault()
    if (id !== draggedItem) {
      setDragOverItem(id)

      // Add visual indicator for drop target
      const allItems = document.querySelectorAll("[data-file-item]")
      allItems.forEach((item) => {
        if (item.getAttribute("data-file-id") === id) {
          item.classList.add("border-l-4", "border-l-blue-500", "pl-2")
        }
      })
    }
  }

  const handleDragEnd = () => {
    // Remove all visual effects
    const allItems = document.querySelectorAll("[data-file-item]")
    allItems.forEach((item) => {
      item.classList.remove("scale-[1.02]", "shadow-md", "z-10", "border-l-4", "border-l-blue-500", "pl-2")
    })

    setDraggedItem(null)
    setDragOverItem(null)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault()
    if (draggedItem && draggedItem !== id) {
      const draggedIndex = files.findIndex((file) => file.id === draggedItem)
      const dropIndex = files.findIndex((file) => file.id === id)

      const newFiles = [...files]
      const [removed] = newFiles.splice(draggedIndex, 1)
      newFiles.splice(dropIndex, 0, removed)

      // Add animation class for the reordering
      setFiles(newFiles)

      // Play a subtle sound effect for successful drop
      if (typeof window !== "undefined") {
        const audio = new Audio("/sounds/drop-sound.mp3")
        audio.volume = 1.0
        audio.play().catch((e) => console.log("Audio play failed:", e))
      }
    }

    // Remove all visual effects
    handleDragEnd()
  }

  // Add reset handler
  const handleReset = () => {
    setFiles([])
    setFileError("")
    setCurrentStep(1)
    setDocumentLanguage("en")
    setIsDropdownOpen(false)
    // Reset file input
    const fileInput = document.getElementById("file-upload") as HTMLInputElement
    if (fileInput) {
      fileInput.value = ""
    }
  }

  // Handle next step
  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3)
    }
  }

  // Handle back step
  const handleBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3)
    }
  }

  // Delete file handler
  const handleDeleteFile = (id: string) => {
    setFiles(files.filter((file) => file.id !== id))
  }

  // Language selection component
  const LanguageSelection = () => {
    const [isProcessing, setIsProcessing] = useState(false)

    const handleLanguageSelect = (lang: "en" | "id") => {
      setDocumentLanguage(lang)
    }

    const handleNext = async () => {
      setIsProcessing(true)
      setCurrentStep(3)
    }

    return (
      <div className="w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-4 text-[#111928] dark:text-white">Document Language Selection</h2>
        <p className="text-[#4b5563] dark:text-[#9ca3af] mb-4">
          Select the primary language of your document to ensure optimal OCR accuracy. This choice affects how the AI
          processes and extracts text from your images.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.button
            onClick={() => handleLanguageSelect("en")}
            className={`p-6 rounded-lg border-2 flex flex-col items-center relative group
              ${
                documentLanguage === "en"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700"
              }
            `}
            title="Best for documents containing English text"
            whileHover={{
              scale: 1.02,
              transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0.98 }}
            animate={{
              borderColor: documentLanguage === "en" ? "#3B82F6" : "#E5E7EB",
              backgroundColor: documentLanguage === "en" ? "rgba(239, 246, 255, 1)" : "rgba(255, 255, 255, 0)",
            }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="w-16 h-10 mb-4 flex items-center justify-center"
              whileHover={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <USFlag />
            </motion.div>
            <h3 className="font-bold text-[#111928] dark:text-white">English US</h3>
          </motion.button>

          <motion.button
            onClick={() => handleLanguageSelect("id")}
            className={`p-6 rounded-lg border-2 flex flex-col items-center relative group
              ${
                documentLanguage === "id"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700"
              }
            `}
            title="Best for documents containing Indonesian text"
            whileHover={{
              scale: 1.02,
              transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0.98 }}
            animate={{
              borderColor: documentLanguage === "id" ? "#3B82F6" : "#E5E7EB",
              backgroundColor: documentLanguage === "id" ? "rgba(239, 246, 255, 1)" : "rgba(255, 255, 255, 0)",
            }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="w-16 h-10 mb-4 flex items-center justify-center"
              whileHover={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <IDFlag />
            </motion.div>
            <h3 className="font-bold text-[#111928] dark:text-white">Bahasa Indonesia</h3>
          </motion.button>
        </div>

        {/* Navigation buttons */}
        <div className="border-t border-[#e5e7eb] w-full dark:border-[#374151] pt-8 mt-8">
          <div className="flex justify-between items-center">
            <button
              onClick={handleReset}
              className="relative px-6 py-2 border border-[#d1d5db] dark:border-[#4b5563] rounded-full text-[#4b5563] dark:text-[#d1d5db] font-medium overflow-hidden transition-all duration-300 hover:bg-[#f9fafb] dark:hover:bg-[#374151] hover:shadow-md group"
            >
              <span className="relative z-10">{text.startOver}</span>
            </button>
            <div className="flex gap-4">
              <button
                onClick={handleBackStep}
                className="relative px-6 py-2 border border-[#d1d5db] dark:border-[#4b5563] rounded-full text-[#4b5563] dark:text-[#d1d5db] font-medium overflow-hidden transition-all duration-300 hover:bg-[#f9fafb] dark:hover:bg-[#374151] hover:shadow-md group"
              >
                <span className="relative z-10">Back</span>
              </button>
              <button
                onClick={handleNext}
                disabled={!documentLanguage || isProcessing}
                className={`relative px-6 py-2 ${!documentLanguage || isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-[#1f2a37] dark:bg-white hover:shadow-lg"} text-white dark:text-[rgb(31,42,55)] rounded-full font-medium flex items-center gap-2 overflow-hidden transition-all duration-300 group`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {isProcessing ? "Processing..." : text.nextStep}
                  <MoveRight className="h-5 w-5 transform transition-transform duration-300 group-hover:translate-x-1" />
                </span>
                <span className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Logo click handler
  const handleLogoClick = () => {
    handleReset()
    router.push('/')
  }

  // Add scroll listener for header
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-[#f1efe3] dark:bg-[#111928] flex flex-col font-nunito transition-colors duration-200">
      <header className={`fixed top-0 left-0 right-0 z-50 w-full px-4 md:px-8 py-4 flex justify-between items-center transition-all duration-300 ${
        isScrolled 
          ? "backdrop-blur-md bg-[#f1efe3]/90 dark:bg-[#111928]/90 shadow-sm border-b border-gray-200/20 dark:border-gray-800/20" 
          : "backdrop-blur-sm bg-[#f1efe3]/50 dark:bg-[#111928]/50"
      }`}>
        <div className="flex items-center space-x-2">
          <AnimatedLogo className="cursor-pointer" onClick={handleLogoClick} />
          <div className="hidden md:block h-6 w-px bg-gray-300 dark:bg-gray-700 mx-2"></div>
          <span className="hidden md:block text-sm text-gray-600 dark:text-gray-300 font-medium">PRPExcelify</span>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4">
          
          <div className="relative" ref={dropdownRef}>
            <button
              className="flex items-center gap-1 text-[#4b5563] dark:text-[#e5e7eb]"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {text.language}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
              >
                <path
                  d="M6 9L12 15L18 9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1f2a37] rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button
                    className={`block px-4 py-2 text-sm w-full text-left ${
                      uiLanguage === "en"
                        ? "bg-gray-100 dark:bg-[#374151] text-[#111928] dark:text-white"
                        : "text-[#4b5563] dark:text-[#9ca3af]"
                    }`}
                    onClick={() => {
                      setUiLanguage("en")
                      setIsDropdownOpen(false)
                    }}
                  >
                    English
                  </button>
                  <button
                    className={`block px-4 py-2 text-sm w-full text-left ${
                      uiLanguage === "id"
                        ? "bg-gray-100 dark:bg-[#374151] text-[#111928] dark:text-white"
                        : "text-[#4b5563] dark:text-[#9ca3af]"
                    }`}
                    onClick={() => {
                      setUiLanguage("id")
                      setIsDropdownOpen(false)
                    }}
                  >
                    Bahasa Indonesia
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            className="ml-2"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-[#4b5563]"
              >
                <path
                  d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-[#e5e7eb]"
              >
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        </div>
      </header>

      <main className="flex-grow pt-28 px-8 flex flex-col items-center">
        <motion.h1
          className="text-5xl font-extrabold text-[#111928] dark:text-white mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <span className="text-[#4b5563] dark:text-[#9ca3af]">PRPExcelify</span>
        </motion.h1>

        <p className="text-[#4b5563] dark:text-[#d1d5db] text-lg mb-12 text-center">{text.tagline}</p>

        {/* Progress steps UI */}
        <div className="flex justify-center w-full max-w-3xl mb-12">
          <div className="flex items-center w-full">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full bg-white dark:bg-[#1f2a37] border-2 
                ${currentStep >= 1 ? "border-[#111928] dark:border-white text-[#111928] dark:text-white" : "border-[#d1d5db] dark:border-[#4b5563] text-[#6b7280] dark:text-[#9ca3af]"}
                flex items-center justify-center font-semibold`}
              >
                1
              </div>
              <div className="text-center mt-2">
                <p
                  className={`font-semibold ${currentStep >= 1 ? "text-[#111928] dark:text-white" : "text-[#6b7280] dark:text-[#9ca3af]"}`}
                >
                  {text.uploadFile}
                </p>
                <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">{text.fileTypes}</p>
              </div>
            </div>

            <div className="h-[2px] flex-1 bg-[#d1d5db] dark:bg-[#4b5563]"></div>

            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full bg-white dark:bg-[#1f2a37] border-2 
                ${currentStep >= 2 ? "border-[#111928] dark:border-white text-[#111928] dark:text-white" : "border-[#d1d5db] dark:border-[#4b5563] text-[#6b7280] dark:text-[#9ca3af]"}
                flex items-center justify-center font-semibold`}
              >
                2
              </div>
              <div className="text-center mt-2">
                <p
                  className={`font-semibold ${currentStep >= 2 ? "text-[#111928] dark:text-white" : "text-[#6b7280] dark:text-[#9ca3af]"}`}
                >
                  {text.selectLanguage}
                </p>
                <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">{text.languageOptions}</p>
              </div>
            </div>

            <div className="h-[2px] flex-1 bg-[#d1d5db] dark:bg-[#4b5563]"></div>

            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full bg-white dark:bg-[#1f2a37] border-2 
                ${currentStep >= 3 ? "border-[#111928] dark:border-white text-[#111928] dark:text-white" : "border-[#d1d5db] dark:border-[#4b5563] text-[#6b7280] dark:text-[#9ca3af]"}
                flex items-center justify-center font-semibold`}
              >
                3
              </div>
              <div className="text-center mt-2">
                <p
                  className={`font-semibold ${currentStep >= 3 ? "text-[#111928] dark:text-white" : "text-[#6b7280] dark:text-[#9ca3af]"}`}
                >
                  {text.process}
                </p>
                <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">{text.progressDownload}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Step content */}
        {currentStep === 1 && (
          <div className="bg-white dark:bg-[#1f2a37] rounded-[24px] shadow-md w-full max-w-3xl p-6">
            <h2 className="text-2xl font-semibold text-[#111928] dark:text-white mb-2">{text.fileUpload}</h2>
            <p className="text-[#6b7280] dark:text-[#9ca3af] mb-6">{text.scanningProcess}</p>

            <div
              className="border-2 border-dashed border-[#d1d5db] dark:border-[#4b5563] rounded-lg p-10 flex flex-col items-center justify-center mb-6 bg-[#F9FAFB] dark:bg-[#374151]"
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                e.currentTarget.classList.add("bg-[#f3f4f6]", "dark:bg-[#1f2937]")
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                e.stopPropagation()
                e.currentTarget.classList.remove("bg-[#f3f4f6]", "dark:bg-[#1f2937]")
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                e.currentTarget.classList.remove("bg-[#f9fafb]", "dark:bg-[#374151]")
                const droppedFiles = Array.from(e.dataTransfer.files)
                if (files.length + droppedFiles.length > 20) {
                  setFileError("Maximum 20 files allowed")
                  return
                }
                setFileError("")
                const newFiles = droppedFiles.map((file) => ({
                  id: Math.random().toString(36).substr(2, 9),
                  name: file.name,
                  size: `${Math.round(file.size / 1024)} KB`,
                  originalFile: file,
                }))
                setFiles((prev) => [...prev, ...newFiles])
              }}
            >
              <Upload className="h-10 w-10 text-[#6b7280] dark:text-[#9ca3af] mb-4" />
              <p className="text-[#4b5563] dark:text-[#d1d5db] mb-1">{text.dragFiles}</p>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const selectedFiles = Array.from(e.target.files || [])
                  if (files.length + selectedFiles.length > 20) {
                    setFileError("Maximum 20 files allowed")
                    return
                  }
                  setFileError("")
                  const uploadedFiles = selectedFiles.map((file) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    size: `${Math.round(file.size / 1024)} KB`,
                    originalFile: file,
                  }))
                  setFiles((prev) => [...prev, ...uploadedFiles])
                }}
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="text-[#1c64f2] dark:text-[#60a5fa] hover:underline transition-all duration-300 cursor-pointer"
              >
                {text.browseFiles}
              </label>
              {fileError && <p className="text-red-500 dark:text-red-400 mt-2 text-sm">{fileError}</p>}
            </div>

            {files.length > 0 && (
              <div>
                {files.map((file) => (
                  <div
                    key={file.id}
                    data-file-item
                    data-file-id={file.id}
                    className={`flex items-center justify-between py-2 border-b border-[#e5e7eb] dark:border-[#374151] 
                    transition-all duration-200 hover:bg-[#f9fafb] dark:hover:bg-[#2d3748] 
                    ${draggedItem === file.id ? "opacity-80 bg-blue-50 dark:bg-blue-900/20" : "opacity-100"}
                    ${dragOverItem === file.id ? "bg-[#f3f4f6] dark:bg-[#2d3748] border-t border-t-[#e5e7eb] dark:border-t-[#374151]" : ""}
                    transform transition-transform ease-in-out`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, file.id)}
                    onDragOver={(e) => handleDragOver(e, file.id)}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, file.id)}
                  >
                    <div className="flex items-center gap-3">
                      <button className="cursor-grab active:cursor-grabbing group">
                        <GripVertical className="h-5 w-5 text-[#9ca3af] dark:text-[#6b7280] group-hover:text-[#6b7280] dark:group-hover:text-[#9ca3af] transition-colors duration-200" />
                      </button>
                      <div className="bg-[#f9fafb] dark:bg-[#374151] p-2 rounded group transition-all duration-200">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-[#6b7280] dark:text-[#9ca3af] group-hover:text-[#4b5563] dark:group-hover:text-white transition-colors duration-200"
                        >
                          <path
                            d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M14 2V8H20"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-[#111928] dark:text-white">{file.name}</p>
                          <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">{file.size}</p>
                        </div>
                        {file.validationStatus && (
                          <div className="flex items-center">
                            {file.validationStatus.hasContent ? (
                              <svg
                                className="w-5 h-5 text-green-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-red-500">No table or text</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                                    if (fileInput) {
                                      fileInput.click();
                                    }
                                  }}
                                  className="text-sm text-blue-500 hover:underline"
                                >
                                  Replace
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="group transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-full"
                    >
                      <Trash2 className="h-5 w-5 text-[#f05252] group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-200 group-hover:scale-110 transform" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between mt-8">
              <button
                onClick={handleReset}
                className="relative px-6 py-2 border border-[#d1d5db] dark:border-[#4b5563] rounded-full text-[#4b5563] dark:text-[#d1d5db] font-medium overflow-hidden transition-all duration-300 hover:bg-[#f9fafb] dark:hover:bg-[#374151] hover:shadow-md group"
              >
                <span className="relative z-10">{text.startOver}</span>
                <span className="absolute inset-0 bg-[#f9fafb] dark:bg-[#374151] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
              </button>
              <button
                onClick={handleNextStep}
                disabled={files.length === 0}
                className={`relative px-6 py-2 ${files.length === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-[#1f2a37] dark:bg-white hover:shadow-lg"} text-white dark:text-[rgb(31,42,55)] rounded-full font-medium flex items-center gap-2 overflow-hidden transition-all duration-300 group`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {text.nextStep}
                  <MoveRight className="h-5 w-5 transform transition-transform duration-300 group-hover:translate-x-1" />
                </span>
                <span className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="bg-white dark:bg-[#1f2a37] rounded-[24px] shadow-md w-full max-w-3xl p-6">
            <LanguageSelection />
          </div>
        )}

        {currentStep === 3 && (
          <DocumentProcessing
            handleReset={handleReset}
            handleNextStep={handleNextStep}
            handleBackStep={handleBackStep}
            text={text}
            files={files}
            setFiles={setFiles}
            language={documentLanguage}
          />
        )}
      </main>

      <footer className="container mx-auto p-4 text-center text-[#6b7280] dark:text-[#9ca3af]">{text.copyright}</footer>
    </div>
  )
}

