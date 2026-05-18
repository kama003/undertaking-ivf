import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { UndertakingData } from '../types';
import * as PDFJS from 'pdfjs-dist';
import jsQR from 'jsqr';

// Configure PDFJS worker
// Using a fixed version to ensure CDN match
const PDFJS_VERSION = '3.11.174';
PDFJS.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

export const generateUndertakingPDF = async (data: UndertakingData, qrDataUrl: string): Promise<Blob> => {
  const doc = new jsPDF();
  
  // Header section (Matching the image)
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  
  // Title
  doc.setFontSize(14);
  const title = 'RK BIOTECH FERTILE SOLUTIONS: ART BANK';
  doc.text(title, 105, 30, { align: 'center' });
  
  // Registration Number
  doc.setFontSize(11);
  const regNo = 'REGD. NO: PB/AB/2022/10041/AB/SAS Nagar/017';
  const regNoWidth = doc.getTextWidth(regNo);
  doc.text(regNo, 105, 40, { align: 'center' });
  
  // Barcode next to Registration Number (NAGAR/017)
  // Positioned to the right of the registration line, larger for easier scanning
  const qrSize = 21;
  doc.addImage(qrDataUrl, 'PNG', 107 + (regNoWidth / 2) + 5 , 32, qrSize, qrSize);
  
  // Sub-title
  doc.setFont('helvetica', 'normal');
  doc.text('Undertaking by ART Bank', 105, 50, { align: 'center' });

  // Recipient
  doc.setFontSize(12);
  doc.text('To,', 25, 70);
  doc.setFont('helvetica', 'bold');
  doc.text('IVF Center', 25, 85);
  doc.text(data.hospitalName.toUpperCase(), 25, 100);

  // Main Body
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const bodyText = `R.K. Biotech, a registered ART Bank with registration number: PB/AB/2022/10041/AB/SAS Nagar/017 having registered office at S.C.O. 1042, 2nd Floor, Connaught Plaza, TDI City, Sector 74-A, SAS Nagar, Mohali, Punjab-160071, do hereby confirm details as given below:-`;
  
  const splitBody = doc.splitTextToSize(bodyText, 160);
  doc.text(splitBody, 25, 125, { lineHeightFactor: 1.5 });

  let yPos = 160;
  
  if (data.useDetailedFormat) {
    // Detailed format
    doc.setFont('helvetica', 'bold');
    doc.text('COUPLE DETAILS:', 25, yPos);
    doc.setFont('helvetica', 'normal');
    
    yPos += 12;
    doc.text(`Wife Name:`, 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.wifeName || 'N/A'}`, 65, yPos);
    
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Wife Aadhar:`, 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.wifeAadhar || 'N/A'}`, 65, yPos);
    
    yPos += 12;
    doc.setFont('helvetica', 'normal');
    doc.text(`Husband Name:`, 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.husbandName || 'N/A'}`, 65, yPos);
    
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Husband Aadhar:`, 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.husbandAadhar || 'N/A'}`, 65, yPos);
    
    yPos += 15;
    doc.setFont('helvetica', 'normal');
    doc.text(`DONOR UHID:`, 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.uhid}`, 65, yPos);
    
    yPos += 15;
    const donorText = `ART Bank has not supplied Sperms of the Donor Number- UHID: ${data.uhid} to more than one commissioning couple/single women or clinic.`;
    const splitDonor = doc.splitTextToSize(donorText, 160);
    doc.setFont('helvetica', 'normal');
    doc.text(splitDonor, 25, yPos, { lineHeightFactor: 1.5 });
  } else {
    // Basic format (as in image)
    const donorText = `ART Bank has not supplied Sperms of the Donor Number- UHID: ${data.uhid} to more than one commissioning couple/single women or clinic.`;
    const splitDonor = doc.splitTextToSize(donorText, 160);
    doc.text(splitDonor, 25, yPos, { lineHeightFactor: 1.5 });
  }

  // Footer / Signatory
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signatory', 25, 250);
  doc.text('ART Bank', 25, 260);

  // Hidden tracking info for barcode scan
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.text(`ID: ${data.id} | ${data.generatedDate}`, 150, 285);

  return doc.output('blob');
};

export const mergePDFs = async (pdfBlobs: Blob[]): Promise<Blob> => {
  const mergedPdf = await PDFDocument.create();
  for (const blob of pdfBlobs) {
    const arrayBuffer = await blob.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  const pdfBytes = await mergedPdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

export const splitAndRecognizePDF = async (pdfBlob: Blob): Promise<{uhid: string, pageBlob: Blob}[]> => {
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pageCount = pdfDoc.getPageCount();
  const results = [];

  const pdfjsDoc = await PDFJS.getDocument({ data: arrayBuffer }).promise;

  for (let i = 0; i < pageCount; i++) {
    // Extract single page
    const newDoc = await PDFDocument.create();
    const [copiedPage] = await newDoc.copyPages(pdfDoc, [i]);
    newDoc.addPage(copiedPage);
    const pageBytes = await newDoc.save();
    const pageBlob = new Blob([pageBytes], { type: 'application/pdf' });

    // Recognize QR Code
    let uhid = 'UNKNOWN';
    try {
      const page = await pdfjsDoc.getPage(i + 1);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context!, viewport }).promise;

      const imageData = context!.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        uhid = code.data; // We assuming QR contains UHID
      }
    } catch (e) {
      console.error("QR Code detection failed for page", i, e);
    }

    results.push({ uhid, pageBlob });
  }

  return results;
};
