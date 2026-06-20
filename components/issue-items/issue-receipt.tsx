"use client"

import "regenerator-runtime/runtime"
import { Button } from "@/components/ui/button"
import { useRef } from "react"

export interface IssueReceiptData {
  id: number
  issue_number: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  status: string
  issue_date: string
  return_date: string
  total_amount: string | number
  payment_status: "unpaid" | "paid"
  payment_type?: "Cash" | "Credit"
  items: Array<{
    id: number
    name: string
    quantity: number
    price: string | number
    serial_codes?: string[]
    sku?: string
  }>
  notes?: string
  customer_address?: string
  customer_nic?: string
  issue_address?: string
}

interface IssueReceiptProps {
  data: IssueReceiptData
  onBack?: () => void
}

/**
 * Helper to unroll items with multiple serial numbers into individual records of quantity 1
 */
function unrollItems(items: Array<{
  id: number
  name: string
  quantity: number
  price: string | number
  serial_codes?: string[]
  sku?: string
}>) {
  const result: typeof items = []
  for (const item of items) {
    if (item.serial_codes && item.serial_codes.length > 0) {
      item.serial_codes.forEach((code) => {
        result.push({
          ...item,
          quantity: 1,
          serial_codes: [code]
        })
      })
    } else {
      result.push(item)
    }
  }
  return result
}

export type PaperSize = 'A4' | 'A5'

/**
 * Common helper to overlay dynamic content on top of issue_note_template.pdf
 * @param paperSize 'A4' (default, 210×297 mm) or 'A5' (148×210 mm)
 */
let cachedFontBytes: ArrayBuffer | null = null;
let cachedTemplateA4Bytes: ArrayBuffer | null = null;
let cachedTemplateA5Bytes: ArrayBuffer | null = null;

export async function generateIssuePDFBytes(data: IssueReceiptData, paperSize: PaperSize = 'A4'): Promise<Uint8Array> {
  const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib")
  const fontkit = (await import("@pdf-lib/fontkit")).default

  // Pick the correct pre-printed template based on paper size
  const templateFile = paperSize === 'A5' ? "/issue_note_a5_template.pdf" : "/issue_note_template.pdf"

  // Fetch font if not cached
  if (!cachedFontBytes) {
    const fontRes = await fetch("/Nirmala.ttf")
    if (!fontRes.ok) throw new Error("Failed to load Sinhala Unicode font (Nirmala.ttf)")
    cachedFontBytes = await fontRes.arrayBuffer()
  }

  // Fetch template if not cached
  let templateBytes: ArrayBuffer;
  if (paperSize === 'A5') {
    if (!cachedTemplateA5Bytes) {
      const templateRes = await fetch(templateFile)
      if (!templateRes.ok) throw new Error(`Failed to load PDF template (${templateFile})`)
      cachedTemplateA5Bytes = await templateRes.arrayBuffer()
    }
    templateBytes = cachedTemplateA5Bytes;
  } else {
    if (!cachedTemplateA4Bytes) {
      const templateRes = await fetch(templateFile)
      if (!templateRes.ok) throw new Error(`Failed to load PDF template (${templateFile})`)
      cachedTemplateA4Bytes = await templateRes.arrayBuffer()
    }
    templateBytes = cachedTemplateA4Bytes;
  }

  const fontBytes = cachedFontBytes;

  const pdfDoc = await PDFDocument.load(templateBytes)
  pdfDoc.registerFontkit(fontkit)

  const customFont = await pdfDoc.embedFont(fontBytes)
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const page = pdfDoc.getPages()[0]
  const sf = 2.83464567 // 72 pt / 25.4 mm
  // Page height in mm depends on paper size (A4 = 297 mm, A5 = 210 mm)
  const pageHeightMm = paperSize === 'A5' ? 210 : 297

  // Coordinate helper mapping mm from top-left to points from bottom-left
  // Safe drawText: if the requested font fails (e.g. fontkit Indic shaping bug with Nirmala.ttf),
  // automatically retry with Helvetica so the PDF is still generated.
  const drawText = (text: string, x_mm: number, y_mm: number, size = 9, font = helveticaFont, align = "left") => {
    const x = x_mm * sf
    const y = (pageHeightMm - y_mm) * sf

    const attemptDraw = (f: typeof font) => {
      let drawX = x
      if (align === "center") {
        const textWidth = f.widthOfTextAtSize(text, size)
        drawX = x - textWidth / 2
      } else if (align === "right") {
        const textWidth = f.widthOfTextAtSize(text, size)
        drawX = x - textWidth
      }

      page.drawText(text, {
        x: drawX,
        y: y,
        size: size,
        font: f,
        color: rgb(0, 0, 0),
      })
    }

    try {
      attemptDraw(font)
    } catch (e) {
      // fontkit shaping failed (e.g. null syllable for complex script) — fall back to Helvetica
      if (font !== helveticaFont) {
        try {
          attemptDraw(helveticaFont)
        } catch (_) {
          // silently skip if even the fallback fails
        }
      }
    }
  }

  // 1. Header Metadata
  const fullIssueNum = data.issue_number || `ISS-${data.id}`

  const issueDateObj = new Date(data.issue_date)
  const currentDateObj = issueDateObj//new Date(Date.now())
  const issuedateStr = issueDateObj.toISOString().split("T")[0]
  const dateStr = currentDateObj.toISOString().split("T")[0]
  const timeStr = currentDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })

  drawText(fullIssueNum, paperSize === 'A5' ? 10 : 25, paperSize === 'A5' ? 15 : 30, 10, helveticaBold)
  drawText(dateStr, paperSize === 'A5' ? 105 : 160, paperSize === 'A5' ? 40 : 59, 9, helveticaBold)
  drawText(timeStr, paperSize === 'A5' ? 105 : 160, paperSize === 'A5' ? 49 : 69, 9, helveticaBold)

  // 2. Customer Info
  const customerName = data.customer_name || ""
  const issueAddress = data.issue_address || ""
  const customerPhone = data.customer_phone || ""
  const customerNIC = data.customer_nic || ""

  // Use custom Nirmala font for names and addresses to support Sinhala overlay
  drawText(customerName, paperSize === 'A5' ? 30 : 50, paperSize === 'A5' ? 55 : 78, paperSize === 'A5' ? 8 : 10, customFont)
  drawText(issueAddress, paperSize === 'A5' ? 30 : 50, paperSize === 'A5' ? 59 : 83, paperSize === 'A5' ? 8 : 10, customFont)
  drawText(customerPhone, paperSize === 'A5' ? 30 : 50, paperSize === 'A5' ? 63 : 88, paperSize === 'A5' ? 8 : 10, helveticaBold)
  drawText(customerNIC, paperSize === 'A5' ? 115 : 144, paperSize === 'A5' ? 63 : 88, paperSize === 'A5' ? 8 : 10, helveticaBold)

  // 3. Table Rows (Up to 12 items fit on the pre-printed table template page)
  const startDate = new Date(data.issue_date)
  const endDate = new Date(data.return_date)
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1

  const unrolled = unrollItems(data.items)
  const items = unrolled.slice(0, 12)
  items.forEach((item, idx) => {
    const y_row = paperSize === 'A5' ? 82 + idx * 4 : 108 + idx * 6
    {
      paperSize === 'A4' &&
        drawText(issuedateStr, 32, y_row, 8, helveticaFont, "center")
    }
    drawText(String(item.quantity), paperSize === 'A5' ? 12 : 52, y_row, 8, helveticaBold, "center")

    // Auto-detect Sinhala Unicode characters in item names to pick appropriate font
    const hasSinhala = /[\u0d80-\u0dff]/.test(item.name)
    const nameFont = hasSinhala ? customFont : helveticaFont

    // Display item name and append serial numbers if they exist
    let displayName = item.name
    if (item.serial_codes && item.serial_codes.length > 0) {
      displayName += ` (${item.serial_codes.join(", ")})`
    }
    drawText(displayName.slice(0, 48), paperSize === 'A5' ? 25 : 63, y_row, 8, nameFont)

    const priceNum = Number(item.price || 0)
    drawText(priceNum.toFixed(2), paperSize === 'A5' ? 80 : 122, y_row, 8, helveticaFont, "right")
    if (data.status === "Returned") {
      drawText(String(numberOfDays), paperSize === 'A5' ? 90 : 137, y_row, 8, helveticaFont, "center")
    }
    if (data.status === "Returned") {
      const subtotal = priceNum * item.quantity * numberOfDays
      drawText(subtotal.toFixed(2), paperSize === 'A5' ? 118 : 166, y_row, 8, helveticaBold, "right")
    }
    if (data.status === "Returned") {
      const retDateStr = new Date(data.return_date).toISOString().split("T")[0]
      drawText(retDateStr, paperSize === 'A5' ? 132 : 181.5, y_row, 8, helveticaFont, "center")
    }
  })

  // 4. Totals Summary
  const grandTotal = Number(data.total_amount || 0)
  if (data.status === "Returned") {
    drawText(grandTotal.toFixed(2), paperSize === 'A5' ? 118 : 165.5, paperSize === 'A5' ? 129 : 178, 9, helveticaBold, "right")
    drawText("0.00", paperSize === 'A5' ? 118 : 165.5, paperSize === 'A5' ? 133 : 184, 9, helveticaFont, "right")
    drawText((data.payment_status === "paid") ? "0.00" : grandTotal.toFixed(2), paperSize === 'A5' ? 118 : 165.5, paperSize === 'A5' ? 137 : 190, 9, helveticaBold, "right")
  }
  // Checkboxes
  // Box 1: Items Taken ("භාණ්ඩ රැගෙන ආවා")
  if (data.status === "Returned") {
    drawText("X", paperSize === 'A5' ? 50 : 73, paperSize === 'A5' ? 133.5 : 184, 12, helveticaBold, "center")
  }

  // Box 2: Paid Status ("මුදල් ගෙව්වා / Paid")
  if (data.payment_status === "paid") {
    drawText("X", paperSize === 'A5' ? 50 : 73, paperSize === 'A5' ? 137 : 190, 12, helveticaBold, "center")
    if (data.payment_type) {
      drawText(`(${data.payment_type})`, paperSize === 'A5' ? 59 : 82, paperSize === 'A5' ? 138 : 190, 9, helveticaBold)
    }
  }

  return await pdfDoc.save()
}

/**
 * Triggers client-side browser file download of the filled PDF
 */
export async function generateIssuePDF(data: IssueReceiptData, paperSize: PaperSize = 'A4') {
  try {
    const pdfBytes = await generateIssuePDFBytes(data, paperSize)
    const blob = new Blob([pdfBytes as any], { type: "application/pdf" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `issue-${data.issue_number}-${paperSize}.pdf`
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 100)
  } catch (error) {
    console.error("PDF generation failed:", error)
    alert("Failed to generate PDF receipt: " + (error as Error).message)
  }
}

/**
 * Generates and automatically triggers the native browser print dialog for the receipt PDF
 * @param paperSize 'A4' (default) or 'A5'
 */
export async function printIssuePDF(data: IssueReceiptData, paperSize: PaperSize = 'A4') {
  try {
    const pdfBytes = await generateIssuePDFBytes(data, paperSize)
    const blob = new Blob([pdfBytes as any], { type: "application/pdf" })
    const blobUrl = URL.createObjectURL(blob)

    // Use a unique iframe id per paper size to avoid conflicts between simultaneous calls
    const iframeId = `pdf-print-iframe-${paperSize.toLowerCase()}`
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement
    if (!iframe) {
      iframe = document.createElement("iframe")
      iframe.id = iframeId
      iframe.style.display = "none"
      document.body.appendChild(iframe)
    }

    iframe.src = blobUrl

    iframe.onload = () => {
      // Small timeout to allow browser loading buffer
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus()
          iframe.contentWindow.print()
        }
      }, 200)
    }
  } catch (error) {
    console.error("PDF printing failed:", error)
    alert("Failed to trigger automatic print: " + (error as Error).message)
  }
}

export function IssueReceipt({ data, onBack }: IssueReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  const startDate = new Date(data.issue_date)
  const endDate = new Date(data.return_date)
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1

  const unrolledItemsList = unrollItems(data.items)

  async function handlePrint(paperSize: PaperSize) {
    await printIssuePDF(data, paperSize)
  }

  async function handleDownload(paperSize: PaperSize) {
    await generateIssuePDF(data, paperSize)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {/* Print size options */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
          <button
            onClick={() => handlePrint('A4')}
            className="px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-700 transition-all flex items-center gap-1"
          >
            🖨️ Print A4
          </button>
          <button
            onClick={() => handlePrint('A5')}
            className="px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-600 text-white hover:bg-slate-500 transition-all flex items-center gap-1"
          >
            🖨️ Print A5
          </button>
        </div>
        {/* Download size options */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
          <button
            onClick={() => handleDownload('A4')}
            className="px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all"
          >
            ⬇ A4 PDF
          </button>
          <button
            onClick={() => handleDownload('A5')}
            className="px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all"
          >
            ⬇ A5 PDF
          </button>
        </div>
        {onBack && (
          <Button onClick={onBack} variant="outline" className="font-bold border-slate-200">
            Back
          </Button>
        )}
      </div>

      <div className="p-8 bg-white border border-gray-300 max-w-2xl rounded-2xl mx-auto shadow-md" ref={receiptRef}>
        {/* Company Header - Sinhala Style */}
        <div className="text-center mb-6 pb-6 border-b-2 border-[#1f2937]">
          <h1 className="text-2xl font-black text-[#1f2937] mb-2">
            චමිත් එන්ටර්ප්‍රයිසස්
          </h1>
          <p className="text-xs font-semibold text-[#4b5563] mb-3">
            නො: 79, ගලගෙදරවත්ත, මොරවින්න, පානදුර.
          </p>
          <div className="bg-[#1f2937] text-white py-1.5 px-6 rounded-full inline-block text-xs font-bold uppercase tracking-wider">
            උපකරණ කුළී පදනම මත රැගෙන යාමේ ගිවිසුම
          </div>
        </div>

        {/* Receipt Number and Fields */}
        <div className="grid grid-cols-3 gap-4 mb-4 text-xs">
          <div>
            <p className="text-[#4b5563] font-medium">බිල්පත : {data.issue_number || "N/A"}</p>
          </div>
          <div className="text-center">
            <p className="font-black text-2xl text-[#1f2937]">
              {data.issue_number?.includes("-")
                ? data.issue_number.split("-").pop()
                : (data.issue_number || "N/A")}
            </p>
          </div>
          <div className="text-right">
            <div className="border border-[#9ca3af] px-3 py-1 inline-block text-xs font-bold rounded">
              දිනය : {data.issue_date ? new Date(data.issue_date).toLocaleDateString() : "___________"}
            </div>
          </div>
        </div>

        <div className="text-xs font-bold text-[#374151] mb-6 space-y-1">
          <p>දු. අංකය : 076-3544480/078-8301452</p>
          <p>වේලාව : {new Date(data.issue_date || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
        </div>

        {/* Customer Details Section */}
        <div className="mb-6 space-y-3 text-sm border-t border-b border-slate-100 py-4">
          <div>
            <p className="text-[#374151]"><span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block mb-0.5">Customer Name / නම</span> {data.customer_name}</p>
          </div>
          <div>
            <p className="text-[#374151]"><span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block mb-0.5">Address / ලිපිනය</span> {data.issue_address || "........................................................................"}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[#374151]"><span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block mb-0.5">Phone / දු. අංකය</span> {data.customer_phone}</p>
            </div>
            <div>
              <p className="text-[#374151]"><span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block mb-0.5">NIC / හැඳුනුම්පත් අංකය</span> {data.customer_nic || "....................................."}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6 overflow-hidden rounded-lg border border-[#1f2937]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1f2937] bg-[#e5e7eb]">
                <th className="border-r border-[#1f2937] p-2 text-center font-bold">පිටුව</th>
                <th className="border-r border-[#1f2937] p-2 text-center font-bold">ප්‍රමාණය</th>
                <th className="border-r border-[#1f2937] p-2 text-left font-bold">උපකරණයේ නම</th>
                <th className="border-r border-[#1f2937] p-2 text-center font-bold">දිනකට කුලිය</th>
                <th className="border-r border-[#1f2937] p-2 text-center font-bold">දින ගණන</th>
                <th className="border-r border-[#1f2937] p-2 text-center font-bold">මුදල</th>
                <th className="p-2 text-center font-bold">රැගෙන ආ දිනය</th>
              </tr>
            </thead>
            <tbody>
              {unrolledItemsList.map((item, idx) => (
                <tr key={idx} className="border-b border-[#1f2937] hover:bg-slate-50/50">
                  <td className="border-r border-[#1f2937] p-2 text-center font-medium">{idx + 1}</td>
                  <td className="border-r border-[#1f2937] p-2 text-center text-xs font-bold">{item.quantity}</td>
                  <td className="border-r border-[#1f2937] p-2 text-xs font-medium">
                    {item.name}
                    {item.serial_codes && item.serial_codes.length > 0 && (
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                        SN: {item.serial_codes.join(", ")}
                      </div>
                    )}
                  </td>
                  <td className="border-r border-[#1f2937] p-2 text-center text-xs font-semibold">Rs. {Number(item.price).toFixed(2)}</td>
                  <td className="border-r border-[#1f2937] p-2 text-center font-medium">{numberOfDays}</td>
                  <td className="border-r border-[#1f2937] p-2 text-center text-xs font-bold">Rs. {(Number(item.price) * item.quantity * numberOfDays).toFixed(2)}</td>
                  <td className="p-2 text-center text-xs font-semibold text-slate-600">
                    {new Date(data.return_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {[...Array(Math.max(0, 5 - unrolledItemsList.length))].map((_, idx) => (
                <tr key={`empty-${idx}`} className="border-b border-[#1f2937] h-8 bg-slate-50/10">
                  <td className="border-r border-[#1f2937] p-1"></td>
                  <td className="border-r border-[#1f2937] p-1"></td>
                  <td className="border-r border-[#1f2937] p-1"></td>
                  <td className="border-r border-[#1f2937] p-1"></td>
                  <td className="border-r border-[#1f2937] p-1"></td>
                  <td className="border-r border-[#1f2937] p-1"></td>
                  <td className="p-1"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total Amount */}
        <div className="text-center mb-6 text-sm font-bold">
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div className="border border-[#1f2937] p-2 rounded-lg bg-slate-50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Grand Total / මුළු මුදල</p>
              <p className="font-extrabold text-slate-900 text-sm">Rs. {Number(data.total_amount).toFixed(2)}</p>
            </div>
            <div className="border border-[#1f2937] p-2 rounded-lg bg-slate-50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Advance / අත්තිකාරම්</p>
              <p className="font-extrabold text-slate-400 text-sm">Rs. 0.00</p>
            </div>
            <div className="border border-[#1f2937] p-2 rounded-lg bg-slate-50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Balance / ඉතිරි මුදල</p>
              <p className="font-extrabold text-[#1f2937] text-sm">Rs. {Number(data.total_amount).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Payment Status Checkboxes */}
        <div className="mb-6 space-y-3 text-xs border-t border-slate-100 pt-4">
          <div className="flex gap-6 justify-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={true}
                readOnly
                className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300"
              />
              <span className="font-bold text-slate-700">භාණ්ඩ රැගෙන ආවා (Issued)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.payment_status === "paid"}
                readOnly
                className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300"
              />
              <span className="font-bold text-slate-700">මුදල් ගෙව්වා / Paid</span>
            </label>
          </div>
          {data.payment_status === "paid" && data.payment_type && (
            <div className="text-center font-bold text-slate-700 mt-2 bg-slate-50 border border-slate-200 py-1.5 px-4 rounded-lg inline-block mx-auto max-w-xs block">
              ගෙවීම් ක්‍රමය / Payment Method: <span className="text-primary font-black uppercase">{data.payment_type}</span>
            </div>
          )}
        </div>

        {/* Signature Section */}
        <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t-2 border-[#1f2937]">
          <div className="text-center text-xs">
            <p className="text-[#374151] font-bold mb-8">උපකරණය ලබාගන්නාගේ අත්සන</p>
            <div className="border-t border-dashed border-[#1f2937] h-8"></div>
          </div>
          <div className="text-center text-xs">
            <p className="text-[#374151] font-bold mb-8">උපකරණය භාරදුන් බවට අත්සන</p>
            <div className="border-t border-dashed border-[#1f2937] h-8"></div>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="text-center text-[9px] font-medium leading-relaxed text-[#4b5563] mt-6 pt-4 border-t border-[#d1d5db] space-y-1">
          <p>* අප ආයතනයෙන් භාණ්ඩ රැගෙන යන වේලාව කුමක් වුවත්, පසුදා උදේ 09:00 ට පෙර භාර දිය යුතුය. එසේ නොවුනහොත්, දින දෙකකට අයකලනු ලැබේ.</p>
          <p>* යම් හෙයකින් උපකරණ හානි වුවහොත් හෝ විනාශ වුවහොත්, ඒ සඳහා නව උපකරණයක් සැපයීම හෝ එම උපකරණයේ මිලට සමාන මුදලක් ආයතනය වෙත ගෙවීමට බැඳී සිටී.</p>
        </div>
      </div>
    </div>
  )
}
