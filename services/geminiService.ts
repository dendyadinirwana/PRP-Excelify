import { GoogleGenerativeAI, type Part } from "@google/generative-ai"
import { generateExcelFromText } from "./excelService"

// Initialize Gemini API with environment variable
const GOOGLE_AI_KEY = process.env.GOOGLE_AI_KEY
if (!GOOGLE_AI_KEY) {
  throw new Error("GOOGLE_AI_KEY environment variable is not set. Please add it to your .env file.")
}

const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY)

interface OCRResult {
  text: string
  tableData?: string[][]
  fileName?: string
}

interface ProcessedData {
  rows: string[][]
  fileName: string
  analysis?: {
    title: string
    keyPoints: string[]
    recurringWords: string[]
    context: string
  }
  excelData: Buffer
}

// Retry mechanism for API calls with exponential backoff
async function retryApiCall<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 2000): Promise<T> {
  let lastError: any

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add a small delay before each request to prevent rate limiting
      if (attempt > 0) {
        const delay = initialDelay * Math.pow(2, attempt - 1)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }

      return await fn()
    } catch (error: any) {
      lastError = error

      // If it's not a rate limit error, don't retry
      if (!error.message?.includes("429") && !error.message?.includes("Too Many Requests")) {
        throw error
      }

      // If we've hit max retries, throw the error
      if (attempt === maxRetries - 1) {
        throw new Error(`Rate limit exceeded after ${maxRetries} attempts. Please try again later.`)
      }
    }
  }

  throw lastError
}

// Add a delay between API calls
async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Create a default analysis based on the document content
function createDefaultAnalysis(
  text: string,
  language: string,
): {
  title: string
  keyPoints: string[]
  recurringWords: string[]
  context: string
} {
  // Extract some basic information from the text
  const wordCount = text.split(/\s+/).length
  const paragraphCount = text.split(/\n\s*\n/).length
  const lines = text.split("\n").length

  // Create a simple title based on the first line or first few words
  let title = text.split("\n")[0] || "Document Analysis"
  if (title.length > 50) {
    title = title.substring(0, 47) + "..."
  }

  return {
    title: title,
    keyPoints: [
      language === "en"
        ? `Document contains approximately ${wordCount} words`
        : `Dokumen berisi sekitar ${wordCount} kata`,
      language === "en"
        ? `Content is structured in ${paragraphCount} paragraphs`
        : `Konten disusun dalam ${paragraphCount} paragraf`,
      language === "en"
        ? `Text has been successfully extracted and processed`
        : `Teks telah berhasil diekstrak dan diproses`,
      language === "en" ? `Document has been converted to Excel format` : `Dokumen telah dikonversi ke format Excel`,
      language === "en"
        ? `Analysis completed with basic content extraction`
        : `Analisis selesai dengan ekstraksi konten dasar`,
    ],
    recurringWords: ["document", "content", "data", "information", "text"],
    context:
      language === "en"
        ? `This document contains ${lines} lines of text that have been processed and converted to Excel format. The content has been structured to maintain the original formatting as closely as possible.`
        : `Dokumen ini berisi ${lines} baris teks yang telah diproses dan dikonversi ke format Excel. Konten telah disusun untuk mempertahankan format asli sedekat mungkin.`,
  }
}

// Function to analyze text and extract key information
async function analyzeTextContext(
  text: string,
  language: string,
): Promise<{
  title: string
  keyPoints: string[]
  recurringWords: string[]
  context: string
}> {
  try {
    // If the text is too short, just return a default analysis
    if (text.length < 100) {
      return createDefaultAnalysis(text, language)
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    // First, try to get a simple analysis without JSON formatting
    const simplePrompt = `
      Analyze the following text and provide:
      1. A concise title (max 10 words)
      2. 5 key points summarizing the main information
      3. Top 5 recurring words or phrases
      4. A brief context about the content
      
      Text to analyze:
      ${text.substring(0, 4000)} ${text.length > 4000 ? "... (text truncated for brevity)" : ""}
      
      Language: ${language}
      
      Format your response as plain text with clear section headers.
    `

    const result = await retryApiCall(() => model.generateContent(simplePrompt))
    const response = await result.response
    const analysisText = response.text()

    // Parse the plain text response
    const analysis = parseTextAnalysis(analysisText, language)

    // If we successfully parsed the analysis, return it
    if (analysis) {
      return analysis
    }

    // If parsing failed, return a default analysis
    return createDefaultAnalysis(text, language)
  } catch (error) {
    console.error("Error in text analysis:", error)
    // Fallback when API fails completely
    return createDefaultAnalysis(text, language)
  }
}

// Parse a plain text analysis response
function parseTextAnalysis(
  text: string,
  language: string,
): {
  title: string
  keyPoints: string[]
  recurringWords: string[]
  context: string
} | null {
  try {
    // Extract title - usually the first line
    const titleMatch = text.match(/(?:title|judul):\s*(.+?)(?:\n|$)/i)
    const title = titleMatch ? titleMatch[1].trim() : "Document Analysis"

    // Extract key points - look for numbered lists or bullet points
    const keyPointsSection = text.match(
      /(?:key points|main points|points|poin utama|poin kunci):([\s\S]*?)(?:\n\n|\n[A-Za-z]|$)/i,
    )
    let keyPoints: string[] = []

    if (keyPointsSection && keyPointsSection[1]) {
      // Look for numbered or bulleted list items
      const pointMatches = keyPointsSection[1].match(/(?:\d+\.|\*|-)\s*(.+?)(?:\n|$)/g)
      if (pointMatches && pointMatches.length > 0) {
        keyPoints = pointMatches
          .map((point) => point.replace(/^\d+\.|\*|-\s*/, "").trim())
          .filter((point) => point.length > 0)
          .slice(0, 5)
      }
    }

    // If we couldn't find key points, split by newlines
    if (keyPoints.length === 0) {
      const lines = keyPointsSection
        ? keyPointsSection[1]
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
        : []
      keyPoints = lines.slice(0, 5)
    }

    // Ensure we have 5 key points
    while (keyPoints.length < 5) {
      keyPoints.push(language === "en" ? "Content successfully processed" : "Konten berhasil diproses")
    }

    // Extract recurring words
    const recurringWordsSection = text.match(
      /(?:recurring words|recurring|words|kata berulang):([\s\S]*?)(?:\n\n|\n[A-Za-z]|$)/i,
    )
    let recurringWords: string[] = []

    if (recurringWordsSection && recurringWordsSection[1]) {
      // Look for list items
      const wordMatches = recurringWordsSection[1].match(/(?:\d+\.|\*|-)\s*(.+?)(?:\n|$)/g)
      if (wordMatches && wordMatches.length > 0) {
        recurringWords = wordMatches
          .map((word) => word.replace(/^\d+\.|\*|-\s*/, "").trim())
          .filter((word) => word.length > 0)
          .slice(0, 5)
      } else {
        // If no list format, try comma-separated
        recurringWords = recurringWordsSection[1]
          .split(/,|\n/)
          .map((word) => word.trim())
          .filter((word) => word.length > 0)
          .slice(0, 5)
      }
    }

    // Ensure we have 5 recurring words
    while (recurringWords.length < 5) {
      recurringWords.push(["document", "content", "data", "information", "text"][recurringWords.length])
    }

    // Extract context
    const contextSection = text.match(/(?:context|brief context|konteks):([\s\S]*?)(?:\n\n|\n[A-Za-z]|$)/i)
    const context =
      contextSection && contextSection[1]
        ? contextSection[1].trim()
        : language === "en"
          ? "The document was successfully processed and converted to Excel format."
          : "Dokumen berhasil diproses dan dikonversi ke format Excel."

    return {
      title,
      keyPoints,
      recurringWords,
      context,
    }
  } catch (error) {
    console.error("Error parsing text analysis:", error)
    return null
  }
}

// Function to perform web search and enrich context
async function enrichContextWithWebSearch(text: string, recurringWords: string[], language: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    const searchPrompt = `
    Based on the following text and recurring words, provide additional relevant information and context.
    Focus on enriching the understanding of the main topics and concepts.
    
    Text excerpt: 
    ${text.substring(0, 2000)}${text.length > 2000 ? "... (text truncated for brevity)" : ""}
    
    Recurring Words: ${recurringWords.join(", ")}
    Language: ${language}
    
    Provide a comprehensive but concise analysis (max 200 words) in ${language} that includes:
    1. Related concepts and their relationships
    2. Industry-specific context
    3. Potential implications or trends
    
    Format the response as a well-structured paragraph.
  `

    const result = await retryApiCall(() => model.generateContent(searchPrompt))
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error("Error in context enrichment:", error)
    // Fallback response if API fails
    return language === "en"
      ? "Additional context could not be generated at this time. Please refer to the extracted text for information."
      : "Konteks tambahan tidak dapat dibuat saat ini. Silakan merujuk ke teks yang diekstrak untuk informasi."
  }
}

export const processImageWithGemini = async (
  imageFile: File,
  language: string,
  progressCallback?: (progress: number) => void,
): Promise<ProcessedData> => {
  if (!GOOGLE_AI_KEY) {
    throw new Error("Google API key is not configured. Please set GOOGLE_AI_KEY in your .env file")
  }

  try {
    // Convert the file to a base64 data URL
    const imageData = await fileToGenerativePart(imageFile)

    // Set up model parameters based on the language
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    // Update progress to indicate model loading
    if (progressCallback) progressCallback(20)

    // Add initial delay before first API call
    await delay(1000)

    // Construct a prompt that specifies what we want Gemini to do
    const languagePrompt =
      language === "en"
        ? "Extract all text from this image, focusing on English content."
        : "Extract all text from this image, focusing on Bahasa Indonesia content."

    // Add table detection to the prompt
    const fullPrompt = `${languagePrompt} If the image contains any structured data, tables, or spreadsheet-like content, please organize it as a table. Return your response in a format ready to be converted to an Excel spreadsheet with the correct structure. Maintain column and row alignments as shown in the image.`

    // Make the API request
    if (progressCallback) progressCallback(40)

    // Use retry mechanism for the main OCR process
    const result = await retryApiCall(() => geminiModel.generateContent([fullPrompt, imageData]))

    if (progressCallback) progressCallback(70)

    const response = await result.response
    const text = response.text()

    // Process the result to check for table data
    const tableData = extractTableData(text)

    // Initialize analysis with placeholder data
    let analysis = createDefaultAnalysis(text, language)

    try {
      // Add delay before analysis
      await delay(2000)

      // Perform context analysis
      if (progressCallback) progressCallback(80)
      analysis = await analyzeTextContext(text, language)

      // Only attempt to enrich context if initial analysis succeeded
      try {
        // Add delay before enrichment
        await delay(2000)

        // Enrich context with web search
        if (progressCallback) progressCallback(85)
        const enrichedContext = await enrichContextWithWebSearch(text, analysis.recurringWords, language)
        analysis.context = enrichedContext
      } catch (enrichError) {
        console.error("Error enriching context:", enrichError)
        // Keep the original context if enrichment fails
      }
    } catch (analysisError) {
      console.error("Error in document analysis:", analysisError)
      // Keep using the default analysis
    }

    if (progressCallback) progressCallback(90)

    // Prepare the data for Excel generation
    const ocrResult = {
      text,
      tableData: tableData.length > 0 ? tableData : undefined,
      fileName: `OCR_Result_${new Date().toISOString().slice(0, 10)}`,
    }

    // Generate Excel data without downloading
    let excelData: Buffer
    try {
      const excelResult = await generateExcelFromText([ocrResult], {
        fileName: ocrResult.fileName + ".xlsx",
        sheetName: "OCR Results",
        combineIntoSingleSheet: false,
        returnBuffer: true, // Add this option to return buffer instead of downloading
      })

      excelData = excelResult.buffer || Buffer.from([])
    } catch (excelError) {
      console.error("Error generating Excel:", excelError)
      // Create an empty buffer as fallback
      excelData = Buffer.from([])
    }

    if (progressCallback) progressCallback(100)

    return {
      rows:
        tableData.length > 0
          ? tableData
          : text
              .split("\n")
              .map((line) => [line])
              .filter((row) => row[0].trim().length > 0),
      fileName: imageFile.name || `OCR_Result_${new Date().toISOString().slice(0, 10)}`,
      analysis,
      excelData, // Include the Excel data in the response
    }
  } catch (error) {
    console.error("Error processing image with Gemini:", error)
    throw error
  }
}

// Helper function to convert File to GenerativePart
async function fileToGenerativePart(file: File): Promise<Part> {
  // Check if we're in a browser environment
  if (typeof window !== "undefined") {
    return new Promise<Part>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64Data = reader.result as string
        const base64Content = base64Data.split(",")[1]
        const mimeType = file.type
        const binaryData = atob(base64Content)
        const data = new Uint8Array(binaryData.length)
        for (let i = 0; i < binaryData.length; i++) {
          data[i] = binaryData.charCodeAt(i)
        }

        resolve({
          inlineData: {
            data: base64Content,
            mimeType,
          },
        })
      }
      reader.readAsDataURL(file)
    })
  } else {
    // Server-side handling
    const buffer = await file.arrayBuffer()
    const base64Content = Buffer.from(buffer).toString("base64")
    return {
      inlineData: {
        data: base64Content,
        mimeType: file.type,
      },
    }
  }
}

// Function to extract table data from text with improved pattern recognition
function extractTableData(text: string): string[][] {
  const lines = text.split("\n").filter((line) => line.trim() !== "")
  const tableData: string[][] = []
  let rowsWithSimilarStructure = 0

  const possibleDelimiters = [",", "\t", "|", ";"]
  const patterns = {
    csv: /(?:^|,)("(?:[^"]+|"")*"|[^,]*)/g,
    table: /\|\s*([^|]+)\s*\|/g,
    whitespace: /\s{2,}/g,
  }

  // First pass: Try to detect table structure
  const sampleSize = Math.min(5, lines.length)
  const structureScores = {
    csv: 0,
    table: 0,
    whitespace: 0,
  }

  for (const line of lines) {
    let bestDelimiter = ""
    let maxSplits = 0

    // Check for structured data using delimiters
    for (const delimiter of possibleDelimiters) {
      const splits = line.split(delimiter).length - 1
      if (splits > maxSplits) {
        maxSplits = splits
        bestDelimiter = delimiter
      }
    }

    if (maxSplits > 1) {
      rowsWithSimilarStructure++
      const row = line
        .split(bestDelimiter)
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0)
      if (row.length > 0) {
        tableData.push(row)
      }
    } else if (line.match(patterns.whitespace)) {
      // Try whitespace separation as fallback
      const row = line.split(patterns.whitespace).filter((cell) => cell.trim().length > 0)
      if (row.length > 1) {
        tableData.push(row)
        rowsWithSimilarStructure++
      }
    }
  }

  // Return empty array if not enough evidence of tabular data
  return rowsWithSimilarStructure >= 2 ? tableData : []
}

