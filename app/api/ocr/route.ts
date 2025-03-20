import { NextRequest, NextResponse } from 'next/server';
import { createWorker } from 'tesseract.js';

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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const language = formData.get('language') as string || 'eng';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image or PDF file.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Initialize Tesseract worker
    const worker = await createWorker();
    await worker.loadLanguage(language);
    await worker.initialize(language);

    try {
      // Perform OCR
      const { data: { text } } = await worker.recognize(buffer);
      await worker.terminate();

      if (!text.trim()) {
        return NextResponse.json(
          { error: 'No text content detected in the file' },
          { status: 400 }
        );
      }

      // Process the extracted text into rows
      const rows = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      return NextResponse.json({
        success: true,
        rows,
        analysis: {
          title: file.name,
          keyPoints: [],
          recurringWords: [],
          context: text
        }
      });

    } catch (ocrError) {
      console.error('OCR processing error:', ocrError);
      return NextResponse.json(
        { error: 'Failed to process the file content' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

