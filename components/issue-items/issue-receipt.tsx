"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
  items: Array<{
    id: number
    name: string
    quantity: number
    price: string | number
    serial_codes?: string[]
    sku?: string
  }>
  notes?: string
}

interface IssueReceiptProps {
  data: IssueReceiptData
  onBack?: () => void
}

export async function generateIssuePDF(data: IssueReceiptData) {
  try {
    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF()

    // Calculate days between dates
    const startDate = new Date(data.issue_date)
    const endDate = new Date(data.return_date)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1

    // Load Nirmala UI Font for Sinhala Unicode
    const fontUrl = "https://raw.githubusercontent.com/taveevut/Windows-10-Fonts-Default/master/Nirmala.ttf"
    const response = await fetch(fontUrl)
    const fontArrayBuffer = await response.arrayBuffer()
    const fontBase64 = btoa(
      new Uint8Array(fontArrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    )
    doc.addFileToVFS("Nirmala.ttf", fontBase64)
    doc.addFont("Nirmala.ttf", "unicode", "normal")

    const pageWidth = doc.internal.pageSize.width
    const margin = 15
    let y = 15

    // 1. Header
    doc.setFont("unicode", "normal")
    doc.setFontSize(22)
    doc.text("චමිත් එන්ටර්ප්‍රයිසස්", pageWidth / 2, y, { align: "center" })
    y += 6
    doc.setFontSize(10)
    doc.text("නො: 79, ගලගෙදරවත්ත, මොරවින්න, පානදුර.", pageWidth / 2, y, { align: "center" })

    y += 5
    doc.setFillColor(0, 0, 0)
    doc.roundedRect(pageWidth / 2 - 55, y, 110, 8, 4, 4, "F")
    doc.setTextColor(255, 255, 255)
    doc.text("උපකරණ කුළී පදනම මත රැගෙන යාමේ ගිවිසුම", pageWidth / 2, y + 5.5, { align: "center" })

    // 2. Metadata Rows
    doc.setTextColor(0, 0, 0)
    y += 15
    doc.setFontSize(11)
    const fullIssueNum = String(data.issue_number || "N/A")
    doc.text(`බිල්පත : ${fullIssueNum}`, margin, y)

    doc.setFontSize(24)
    const shortIssueNum = fullIssueNum.includes("-") ? fullIssueNum.split("-").pop() || fullIssueNum : fullIssueNum
    doc.text(String(shortIssueNum), pageWidth / 2, y + 2, { align: "center" })

    doc.setFontSize(11)
    doc.text("දිනය :", pageWidth - margin - 50, y)
    doc.text(new Date(data.issue_date || Date.now()).toLocaleDateString(), pageWidth - margin - 32, y)
    doc.rect(pageWidth - margin - 35, y - 5, 35, 7)

    y += 10
    doc.text("දු. අංකය : 076-3544480/078-8301452", margin, y)
    doc.text("වේලාව :", pageWidth - margin - 50, y)
    doc.text(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), pageWidth - margin - 32, y)
    doc.rect(pageWidth - margin - 35, y - 5, 35, 7)

    // 3. Customer Info (Dotted Lines)
    y += 15
    doc.text("නම       :", margin, y)
    doc.setFont("unicode", "normal")
    doc.text(data.customer_name || "", margin + 20, y)
    doc.text(".".repeat(140), margin + 15, y)

    y += 8
    doc.text("ලිපිනය   :", margin, y)
    doc.text(".".repeat(140), margin + 15, y)

    y += 8
    doc.text("දු. අංකය :", margin, y)
    doc.text(data.customer_phone || "", margin + 20, y)
    doc.text(".".repeat(60), margin + 18, y)
    doc.text("හැඳුනුම්පත් අංකය:", margin + 85, y)
    doc.text(".".repeat(50), margin + 115, y)

    // 4. Table Construction
    y += 10
    const colWidths = [18, 18, 55, 22, 18, 22, 27]
    const colLabels = ["දිනය", "ප්‍රමාණය", "උපකරණයේ නම", "දිනකට කුලිය", "දින ගණන", "මුදල", "රැගෙන ආ දිනය"]

    let x = margin
    doc.setFontSize(8.5)
    colLabels.forEach((label, i) => {
      doc.rect(x, y, colWidths[i], 12)
      doc.text(label, x + colWidths[i] / 2, y + 7, { align: "center" })
      x += colWidths[i]
    })

    // Table Body Rows
    y += 12
    for (let i = 0; i < 12; i++) {
      let rowX = margin
      const item = data.items[i]
      colWidths.forEach((w, j) => {
        doc.rect(rowX, y, w, 8)
        if (item) {
          if (j === 0) doc.text(new Date(data.issue_date).toLocaleDateString(), rowX + w / 2, y + 5, { align: "center" })
          if (j === 1) doc.text(String(item.quantity), rowX + w / 2, y + 5, { align: "center" })
          if (j === 2) doc.text(item.name.slice(0, 30), rowX + 2, y + 5)
          if (j === 3) doc.text(Number(item.price).toFixed(2), rowX + w - 2, y + 5, { align: "right" })
          if (j === 4) doc.text(String(numberOfDays), rowX + w / 2, y + 5, { align: "center" })
          if (j === 5) doc.text((Number(item.price) * item.quantity * numberOfDays).toFixed(2), rowX + w - 2, y + 5, { align: "right" })
          if (j === 6) doc.text(new Date(data.return_date).toLocaleDateString(), rowX + w / 2, y + 5, { align: "center" })
        }
        rowX += w
      })
      y += 8
    }

    // 5. Footer Summary
    y += 5
    doc.rect(margin, y, 5, 5); doc.text("භාණ්ඩ රැගෙන ආවා", margin + 8, y + 4)
    if (data.status === "Issued") doc.text("/", margin + 1.5, y + 4)

    y += 8
    doc.rect(margin, y, 5, 5); doc.text("මුදල් ගෙව්වා / Paid", margin + 8, y + 4)
    if (data.payment_status === "paid") doc.text("/", margin + 1.5, y + 4)

    let summaryY = y - 8
    doc.text("මුළු මුදල", pageWidth - 75, summaryY + 4)
    doc.rect(pageWidth - margin - 35, summaryY, 35, 8); doc.text(Number(data.total_amount).toFixed(2), pageWidth - margin - 2, summaryY + 6, { align: "right" })

    summaryY += 8
    doc.text("අත්තිකාරම් මුදල", pageWidth - 75, summaryY + 4)
    doc.rect(pageWidth - margin - 35, summaryY, 35, 8)

    summaryY += 8
    doc.text("ඉතිරි මුදල", pageWidth - 75, summaryY + 4)
    doc.rect(pageWidth - margin - 35, summaryY, 35, 8)

    // 6. Signatures
    y += 30
    doc.line(margin, y, margin + 55, y)
    doc.text("උපකරණය ලබාගන්නාගේ අත්සන", margin, y + 5)

    doc.line(pageWidth - margin - 55, y, pageWidth - margin, y)
    doc.text("උපකරණය භාරදුන් බවට අත්සන", pageWidth - margin - 55, y + 5)

    doc.save(`issue-${data.issue_number}.pdf`)
  } catch (error) {
    console.error("Native PDF Error:", error)
    alert("Error generating formatted PDF.")
  }
}

export function IssueReceipt({ data, onBack }: IssueReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    window.print()
  }

  const startDate = new Date(data.issue_date)
  const endDate = new Date(data.return_date)
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1

  async function handleDownload() {
    await generateIssuePDF(data)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={handlePrint} variant="outline">
          Print
        </Button>
        <Button onClick={handleDownload} variant="outline">
          Download PDF
        </Button>
        {onBack && (
          <Button onClick={onBack} variant="outline">
            Back
          </Button>
        )}
      </div>

      <div className="p-8 bg-white border border-gray-400 max-w-2xl rounded-lg mx-auto" ref={receiptRef}>
        {/* Company Header - Sinhala Style */}
        <div className="text-center mb-6 pb-6 border-b-2 border-[#1f2937]">
          <h1 className="text-2xl font-bold text-[#1f2937] mb-2">
            චමිත් එන්ටර්ප්‍රයිසස්
          </h1>
          <p className="text-sm text-[#4b5563] mb-3">
            නො: 79, ගලගෙදරවත්ත, මොරවින්න, පානදුර.
          </p>
          <div className="bg-[#1f2937] text-white py-2 px-4 rounded-full inline-block text-sm font-semibold">
            උපකරණ කුළී පදනම මත රැගෙන යාමේ ගිවිසුම
          </div>
        </div>

        {/* Receipt Number and Fields */}
        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
          <div>
            <p className="text-[#4b5563]">බිල්පත : {data.issue_number || "N/A"}</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-2xl text-[#1f2937]">
              {data.issue_number?.includes("-")
                ? data.issue_number.split("-").pop()
                : (data.issue_number || "N/A")}
            </p>
          </div>
          <div className="text-right">
            <div className="border border-[#9ca3af] px-3 py-1 inline-block text-xs">
              දිනය : {data.issue_date ? new Date(data.issue_date).toLocaleDateString() : "___________"}
            </div>
          </div>
        </div>

        <div className="text-sm text-[#374151] mb-6 space-y-1">
          <p>දු. අංකය : 076-3544480/078-8301452</p>
          <p>වේලාව : {new Date().toLocaleTimeString()}</p>
        </div>

        {/* Customer Details Section */}
        <div className="mb-6 space-y-3 text-sm">
          <div>
            <p className="text-[#374151]">නම &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {data.customer_name}</p>
          </div>
          <div>
            <p className="text-[#374151]">ලිපිනය : ........................................................................</p>
          </div>
          <div>
            <p className="text-[#374151]">ජ ගණන:: {data.customer_phone}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ගුණකිරු ගණන:: .....................................</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full border border-[#1f2937] text-xs">
            <thead>
              <tr className="border-b border-[#1f2937] bg-[#e5e7eb]">
                <th className="border-r border-[#1f2937] p-1.5 text-center font-bold">පිටුව</th>
                <th className="border-r border-[#1f2937] p-1.5 text-center font-bold">ප්‍රමාණය</th>
                <th className="border-r border-[#1f2937] p-1.5 text-left font-bold">උපකරණයේ නම</th>
                <th className="border-r border-[#1f2937] p-1.5 text-center font-bold">දිනකට කුලිය</th>
                <th className="border-r border-[#1f2937] p-1.5 text-center font-bold">දින ගණන</th>
                <th className="border-r border-[#1f2937] p-1.5 text-center font-bold">මුදල</th>
                <th className="border-r border-[#1f2937] p-1.5 text-center font-bold">රැගෙන ආ දිනය</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => (
                <tr key={idx} className="border-b border-[#4b5563]">
                  <td className="border-r border-[#4b5563] p-1.5 text-center">{idx + 1}</td>
                  <td className="border-r border-[#4b5563] p-1.5 text-center text-xs">{item.quantity}</td>
                  <td className="border-r border-[#4b5563] p-1.5 text-xs">
                    {item.name}
                    {item.serial_codes && item.serial_codes.length > 0 && (
                      <div className="text-[10px] text-gray-500">
                        {item.serial_codes.join(", ")}
                      </div>
                    )}
                  </td>
                  <td className="border-r border-[#4b5563] p-1.5 text-center text-xs font-semibold">Rs. {Number(item.price).toFixed(2)}</td>
                  <td className="border-r border-[#4b5563] p-1.5 text-center">{numberOfDays}</td>
                  <td className="border-r border-[#4b5563] p-1.5 text-center text-xs font-semibold">Rs. {(Number(item.price) * item.quantity * numberOfDays).toFixed(2)}</td>
                  <td className="border-r border-[#4b5563] p-1.5 text-center text-xs">
                    {new Date(data.return_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {[...Array(Math.max(0, 5 - data.items.length))].map((_, idx) => (
                <tr key={`empty-${idx}`} className="border-b border-gray-400 h-8">
                  <td className="border-r border-gray-400 p-1"></td>
                  <td className="border-r border-gray-400 p-1"></td>
                  <td className="border-r border-gray-400 p-1"></td>
                  <td className="border-r border-gray-400 p-1"></td>
                  <td className="border-r border-gray-400 p-1"></td>
                  <td className="border-r border-gray-400 p-1"></td>
                  <td className="border-r border-gray-400 p-1"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total Amount */}
        <div className="text-center mb-8 text-sm font-bold">
          <p className="text-[#1f2937]">මුළු මුදල</p>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div className="border border-[#1f2937] p-2">
              <p className="text-xs text-[#4b5563]">මුළු මුදල</p>
              <p className="font-bold">Rs. {Number(data.total_amount).toFixed(2)}</p>
            </div>
            <div className="border border-[#1f2937] p-2">
              <p className="text-xs text-[#4b5563]">අත්තිකාරම් මුදල</p>
              <p className="font-bold">Rs. _________</p>
            </div>
            <div className="border border-[#1f2937] p-2">
              <p className="text-xs text-[#4b5563]">ඉතිරි මුදල</p>
              <p className="font-bold">Rs. _________</p>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="mb-8 space-y-2 text-sm">
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.status === "Issued"}
                readOnly
                className="w-4 h-4"
              />
              <span>භාණ්ඩ රැගෙන ආවා</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.payment_status === "paid"}
                readOnly
                className="w-4 h-4"
              />
              <span>මුදල් ගෙව්වා / Paid</span>
            </label>
          </div>
        </div>

        {/* Signature Section */}
        <div className="grid grid-cols-2 gap-6 mt-8 pt-8 border-t-2 border-[#1f2937]">
          <div className="text-center text-xs">
            <p className="text-[#374151] font-semibold mb-8">උපකරණය ලබාගන්නාගේ අත්සන</p>
            <div className="border-t-2 border-[#1f2937] h-14"></div>
          </div>
          <div className="text-center text-xs">
            <p className="text-[#374151] font-semibold mb-8">උපකරණය භාරදුන් බවට අත්සන</p>
            <div className="border-t-2 border-[#1f2937] h-14"></div>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="text-center text-[10px] text-[#4b5563] mt-8 pt-4 border-t border-[#d1d5db] space-y-1">
          <p>* අප ආයතනයෙන් භාණ්ඩ රැගෙන යන වේලාව කුමක් වුවත්, පසුදා උදේ 09:00 ට පෙර භාර දිය යුතුය. එසේ නොවුනහොත්, දින දෙකකට අයකලනු ලැබේ.</p>
          <p>* යම් හෙයකින් උපකරණ හානි වුවහොත් හෝ විනාශ වුවහොත්, ඒ සඳහා නව උපකරණයක් සැපයීම හෝ එම උපකරණයේ මිලට සමාන මුදලක් ආයතනය වෙත ගෙවීමට බැඳී සිටී.</p>
        </div>
      </div>
    </div>
  )
}
