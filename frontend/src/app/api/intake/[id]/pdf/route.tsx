import { NextRequest, NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import IntakePDFDocument from '@/components/pdf/IntakePDFDocument';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch intake data
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const intakeRes = await fetch(`${baseUrl}/api/intake/${id}`, {
      cache: 'no-store',
    });
    
    if (!intakeRes.ok) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 });
    }
    
    const intake = await intakeRes.json();

    // Generate PDF stream
    const stream = await renderToStream(<IntakePDFDocument intake={intake} />);
    
    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      // renderToStream may yield strings or binary chunks; normalize to Uint8Array/Buffer
      if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk));
      } else {
        chunks.push(chunk);
      }
    }
    const pdfBuffer = Buffer.concat(chunks);

    // Return PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="intake-${id}.pdf"`,
      },
    });
  } catch (error: unknown) {
    console.error('Error generating PDF:', error);
    let details: string;
    if (error instanceof Error) {
      details = error.message;
    } else {
      details = String(error);
    }
    return NextResponse.json(
      { error: 'Failed to generate PDF', details },
      { status: 500 }
    );
  }
}