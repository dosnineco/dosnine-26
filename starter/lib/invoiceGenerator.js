import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generateInvoicePDF(invoiceElement, fileName = 'invoice.pdf') {
  try {
    // Capture the HTML as canvas
    const canvas = await html2canvas(invoiceElement, {
      scale: 2,
      logging: false,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const width = 210; // A4 width in mm
    const height = (canvas.height * width) / canvas.width; // Calculate height maintaining aspect ratio

    const pdf = new jsPDF({
      orientation: height > width ? 'portrait' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    pdf.addImage(imgData, 'PNG', 0, 0, width, height);

    // Add multiple pages if needed
    let heightLeft = height - 297;
    let position = 0;

    while (heightLeft > 0) {
      position = heightLeft - height;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, width, height);
      heightLeft -= 297;
    }

    pdf.save(fileName);
    return { success: true, message: 'PDF downloaded successfully' };
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate PDF');
  }
}

export async function generateInvoicePNG(invoiceElement, fileName = 'invoice.png') {
  try {
    const canvas = await html2canvas(invoiceElement, {
      scale: 2,
      logging: false,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');

    return { success: true, message: 'PNG downloaded successfully' };
  } catch (error) {
    console.error('PNG generation error:', error);
    throw new Error('Failed to generate PNG');
  }
}

export async function generateInvoicePreview(invoiceElement) {
  try {
    const canvas = await html2canvas(invoiceElement, {
      scale: 1,
      logging: false,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Preview generation error:', error);
    throw new Error('Failed to generate preview');
  }
}
