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
  const doc = new jsPDF({ format: 'a3' });

  // A3 dimensions: 297 x 420 mm
  const centerX = 148.5;
  const marginX = 35;
  const textWidth = 227;

  // Header section (Matching the image)
  doc.setTextColor(0, 0, 0);
  doc.setFont('courier', 'bold');

  // Title
  doc.setFontSize(17);
  const title = 'RK BIOTECH FERTILE SOLUTIONS: ART BANK';
  doc.text(title, centerX, 50, { align: 'center' });

  // Registration Number
  doc.setFontSize(16);
  const regNo = 'REGD. NO: PB/AB/2022/10041/AB/SAS Nagar/017';
  const regNoWidth = doc.getTextWidth(regNo);
  doc.text(regNo, centerX, 64, { align: 'center' });

  // Barcode next to Registration Number (NAGAR/017)
  const qrSize = 30;
  doc.addImage(qrDataUrl, 'PNG', centerX + (regNoWidth / 2) + 7, 45, qrSize, qrSize);

  // Sub-title
  doc.setFont('courier', 'normal');
  doc.text('Undertaking by ART Bank', centerX, 85, { align: 'center' });

  // Recipient
  doc.setFontSize(16);
  doc.text('To,', marginX, 113);
  doc.text('IVF Center', marginX, 134);
  doc.text(data.hospitalName.toUpperCase(), marginX, 155);

  // Main Body
  doc.setFont('courier', 'normal');
  doc.setFontSize(16);
  const bodyText = `R.K. Biotech, a registered ART Bank with registration number: PB/AB/2022/10041/AB/SAS Nagar/017 having registered office at S.C.O. 1042, 2nd Floor, Connaught Plaza, TDI City, Sector 74-A, SAS Nagar, Mohali, Punjab-160071, do hereby confirm details as given below:-`;

  const splitBody = doc.splitTextToSize(bodyText, textWidth);
  doc.text(splitBody, marginX, 191, { lineHeightFactor: 2.0 });

  let yPos = 254;

  if (data.useDetailedFormat) {
    // Detailed format
    doc.setFont('courier', 'bold');
    doc.text('COUPLE DETAILS:', marginX, yPos);
    doc.setFont('courier', 'normal');

    yPos += 21;
    doc.text(`Wife Name:`, marginX, yPos);
    doc.setFont('courier', 'bold');
    doc.text(`${data.wifeName || 'N/A'}`, marginX + 56, yPos);

    yPos += 14;
    doc.setFont('courier', 'normal');
    doc.text(`Wife Aadhar:`, marginX, yPos);
    doc.setFont('courier', 'bold');
    doc.text(`${data.wifeAadhar || 'N/A'}`, marginX + 56, yPos);

    yPos += 21;
    doc.setFont('courier', 'normal');
    doc.text(`Husband Name:`, marginX, yPos);
    doc.setFont('courier', 'bold');
    doc.text(`${data.husbandName || 'N/A'}`, marginX + 56, yPos);

    yPos += 14;
    doc.setFont('courier', 'normal');
    doc.text(`Husband Aadhar:`, marginX, yPos);
    doc.setFont('courier', 'bold');
    doc.text(`${data.husbandAadhar || 'N/A'}`, marginX + 56, yPos);

    yPos += 28;
    doc.setFont('courier', 'normal');
    doc.text(`DONOR UHID:`, marginX, yPos);
    doc.setFont('courier', 'bold');
    doc.text(`${data.uhid}`, marginX + 56, yPos);

    yPos += 28;
    const donorText = `ART Bank has not supplied Sperms of the Donor Number- UHID: ${data.uhid} to more than one commissioning couple/single women or clinic.`;
    const splitDonor = doc.splitTextToSize(donorText, textWidth);
    doc.setFont('courier', 'normal');
    doc.text(splitDonor, marginX, yPos, { lineHeightFactor: 2.0 });
  } else {
    // Basic format
    const donorText = `ART Bank has not supplied Sperms of the Donor Number- UHID:   ${data.uhid}   to more than one commissioning couple/single women or clinic.`;
    const splitDonor = doc.splitTextToSize(donorText, textWidth);
    doc.text(splitDonor, marginX, yPos, { lineHeightFactor: 2.0 });
  }

  // Footer / Signatory
  doc.setFont('courier', 'normal');
  doc.text('Authorized Signatory', marginX, 339);
  doc.text('ART Bank', marginX, 360);

  // Hidden tracking info for barcode scan
  doc.setFontSize(11);
  doc.setTextColor(200, 200, 200);
  doc.text(`ID: ${data.id} | ${data.generatedDate}`, 212, 403);

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

export const splitAndRecognizePDF = async (pdfBlob: Blob): Promise<{ uhid: string, pageBlob: Blob }[]> => {
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
