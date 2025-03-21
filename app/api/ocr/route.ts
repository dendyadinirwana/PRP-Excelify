import { NextResponse } from "next/server"
import { processImageWithGemini } from "@/services/geminiService"

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  )
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return new NextResponse("No file provided", { status: 400 })
    }

    // Add file type validation
    const allowedTypes = ["image/jpeg", "image/png", "image/tiff"]
    if (!allowedTypes.includes(file.type)) {
      return new NextResponse(
        "Invalid file type. Please upload an image (JPEG, PNG, or TIFF)",
        { status: 400 },
      )
    }

    const language = (formData.get("language") as string) || "en"

    try {
      const result = await processImageWithGemini(
        file,
        language,
        () => {}, // Progress callback optional in API context
      )

      return NextResponse.json(result)
    } catch (processingError: any) {
      console.error("OCR processing error:", processingError)

      // Create a fallback result with basic information
      const fallbackResult = {
        rows: [],
        fileName: file.name || `OCR_Result_${new Date().toISOString().slice(0, 10)}`,
        analysis: {
          title: language === "en" ? "Document Analysis" : "Analisis Dokumen",
          keyPoints: [
            language === "en" ? "Document processing encountered an error" : "Pemrosesan dokumen mengalami kesalahan",
            language === "en" ? "Basic text extraction was attempted" : "Ekstraksi teks dasar telah dicoba",
            language === "en" ? "Some content may be available" : "Beberapa konten mungkin tersedia",
            language === "en"
              ? "Please try again with a clearer image"
              : "Silakan coba lagi dengan gambar yang lebih jelas",
            language === "en" ? "Contact support if the issue persists" : "Hubungi dukungan jika masalah berlanjut",
          ],
          recurringWords: ["error", "processing", "document", "content", "support"],
          context:
            language === "en"
              ? "The document could not be fully processed due to a technical issue. Please try again or contact support."
              : "Dokumen tidak dapat diproses sepenuhnya karena masalah teknis. Silakan coba lagi atau hubungi dukungan.",
        },
      }

      return NextResponse.json(fallbackResult)
    }
  } catch (error: any) {
    console.error("API route error:", error)
    return new NextResponse("An error occurred while processing the image", { status: 500 })
  }
}
