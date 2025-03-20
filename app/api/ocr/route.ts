import { NextRequest, NextResponse } from 'next/server';
import { createWorker } from 'tesseract.js';
import { Worker } from 'tesseract.js';

export const dynamic = 'force-dynamic';

export type OCRResponse = {
  success: boolean;
  rows?: string[];
  analysis?: {
    title: string;
    keyPoints: string[];
    recurringWords: string[];
    context: string;
  };
  error?: string;
};

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

export const runtime = 'edge';

const processFormData = async (formData: FormData, language: string): Promise<OCRResponse> => {
  const file = formData.get('file') as File | null;
  
  if (!file) {
    throw new Error('No file provided');
  }

  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload an image or PDF file.');
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
      throw new Error('No text content detected in the file');
    }

    // Process the extracted text into rows
    const rows = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return {
      success: true,
      rows,
      analysis: {
        title: file.name,
        keyPoints: [],
        recurringWords: [],
        context: text
      }
    };
  } catch (error) {
    throw error;
  }
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const language = formData.get('language') as string || 'eng';

    const response = await processFormData(formData, language);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

