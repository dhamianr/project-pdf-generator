import PDFDocument from "pdfkit";
import type { FastifyReply } from "fastify";
import type { User, Transaction } from "../types/index.js";
import { i18n, type Lang } from "../utils/translations.js";

function formatDateLatam(dateString: string): string {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function maskDescription(desc: string, type: string): string {
  const sensitiveTypes = ["DEPOSIT", "WITHDRAWAL", "DEPOSIT USD", "PIX OUT"];
  if (sensitiveTypes.includes(type) && desc.length > 15) {
    return `${desc.substring(0, 6)}...${desc.substring(desc.length - 4)}`;
  }
  return desc;
}

function drawTableRow(
  doc: PDFKit.PDFDocument,
  y: number,
  date: string,
  typeText: string,
  description: string,
  currency: string,
  amount: string,
  isHeader: boolean = false,
): void {
  doc
    .font(isHeader ? "Helvetica-Bold" : "Helvetica")
    .fontSize(9)
    .text(date, 50, y)
    .text(typeText, 105, y)
    .text(description, 180, y)
    .text(currency, 360, y)
    .text(amount, 410, y, { width: 90, align: "right" });
}

function drawLine(doc: PDFKit.PDFDocument, y: number): void {
  doc.strokeColor("#e0e0e0").lineWidth(1).moveTo(50, y).lineTo(500, y).stroke();
}

function drawTableHeader(
  doc: PDFKit.PDFDocument,
  startY: number,
  texts: string[],
): number {
  drawLine(doc, startY);
  let y = startY + 10;
  drawTableRow(
    doc,
    y,
    texts[0]!,
    texts[1]!,
    texts[2]!,
    texts[3]!,
    texts[4]!,
    true,
  );
  y += 15;
  drawLine(doc, y);
  return y + 15;
}
export function generateStatementPDF(
  reply: FastifyReply,
  user: User,
  transactions: Transaction[],
  start: string,
  end: string,
  lang: Lang,
): void {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const t = i18n[lang];

  reply.header("Content-Type", "application/pdf");
  reply.header(
    "Content-Disposition",
    `inline; filename=reporte_${user.name.replace(/\s+/g, "_")}.pdf`,
  );
  reply.send(doc);

  try {
    doc.image("./logo.png", 450, 45, { width: 90 });
  } catch (error) {}

  const formattedStart = formatDateLatam(start);
  const formattedEnd = formatDateLatam(end);

  doc.fontSize(20).font("Helvetica-Bold").text(t.title, 50, 50);
  doc
    .fontSize(10)
    .font("Helvetica")
    .text(`${t.client}: ${user.name}`, 50, 80)
    .text(`${t.doc}: ${user.documento}`, 50, 95)
    .text(`${t.period}: ${formattedStart} - ${formattedEnd}`, 50, 110);

  let currentY = 150;
  currentY = drawTableHeader(doc, currentY, t.headers);

  const bottomLimit = 750;

  const totalsByCurrency: Record<string, number> = {};

  if (transactions.length === 0) {
    doc.font("Helvetica-Oblique").text(t.noTx, 50, currentY);
  } else {
    transactions.forEach((tx) => {
      if (currentY > bottomLimit) {
        doc.addPage();
        currentY = 50;
        currentY = drawTableHeader(doc, currentY, t.headers);
      }

      if (!totalsByCurrency[tx.currency]) totalsByCurrency[tx.currency] = 0;
      totalsByCurrency[tx.currency]! += tx.amount;

      const decimals = ["BTC", "ETH", "SOL"].includes(tx.currency) ? 8 : 2;
      const formattedAmount = tx.amount.toFixed(decimals);

      const safeDesc = maskDescription(tx.description, tx.type);
      const formattedDate = formatDateLatam(tx.date);

      const translatedType = t.txTypes[tx.type] ?? tx.type;

      drawTableRow(
        doc,
        currentY,
        formattedDate,
        translatedType,
        safeDesc,
        tx.currency,
        formattedAmount,
      );

      currentY += 20;
    });
  }

  drawLine(doc, currentY);
  currentY += 30;

  const currenciesUsed = Object.keys(totalsByCurrency);
  const boxHeight = 40 + currenciesUsed.length * 15;

  if (currentY > bottomLimit - boxHeight) {
    doc.addPage();
    currentY = 50;
  }

  doc.rect(50, currentY, 450, boxHeight).fillAndStroke("#f8f9fa", "#e0e0e0");
  doc.fillColor("#000000");

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(t.summaryTitle, 65, currentY + 15);
  doc
    .font("Helvetica")
    .fontSize(10)
    .text(`${t.totalOps} ${transactions.length}`, 300, currentY + 15);

  let summaryY = currentY + 35;

  currenciesUsed.forEach((currency) => {
    const decimals = ["BTC", "ETH", "SOL"].includes(currency) ? 8 : 2;
    const totalAmount = totalsByCurrency[currency]!.toFixed(decimals);

    doc.font("Helvetica-Bold").text(currency, 65, summaryY);
    doc.font("Helvetica").text(totalAmount, 120, summaryY);
    summaryY += 15;
  });

  doc.end();
}
