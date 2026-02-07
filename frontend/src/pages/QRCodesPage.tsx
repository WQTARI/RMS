import { useQuery } from '@tanstack/react-query'
import { fetchTables } from '../api/tables'
import { PageHeader } from '../components/PageHeader'
import { QrCode, Download, Printer } from 'lucide-react'


export const QRCodesPage = () => {
    const { data: tables = [], isLoading } = useQuery({
        queryKey: ['tables'],
        queryFn: fetchTables,
    })

    const baseUrl = window.location.origin

    const generateQRCode = (tableId: number) => {
        const url = `${baseUrl}/menu?table=${tableId}`
        // Using QR Server API for simplicity
        return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`
    }

    const downloadQR = (tableId: number, tableName: string) => {
        const qrUrl = generateQRCode(tableId)
        const link = document.createElement('a')
        link.href = qrUrl
        link.download = `QR-${tableName}.png`
        link.click()
    }

    const printQR = (tableId: number, tableName: string) => {
        const qrUrl = generateQRCode(tableId)
        const printWindow = window.open('', '_blank')
        if (printWindow) {
            printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>QR Code - ${tableName}</title>
            <style>
              @page { size: A4; margin: 2cm; }
              body {
                font-family: 'Arial', sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
              }
              .qr-container {
                text-align: center;
                border: 3px solid #1e293b;
                border-radius: 24px;
                padding: 40px;
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                box-shadow: 0 20px 60px rgba(0,0,0,0.1);
              }
              h1 {
                font-size: 48px;
                font-weight: 900;
                color: #1e293b;
                margin: 0 0 20px 0;
                letter-spacing: -1px;
              }
              .subtitle {
                font-size: 18px;
                color: #64748b;
                margin-bottom: 40px;
                font-weight: 600;
              }
              img {
                border: 4px solid white;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                margin: 20px 0;
              }
              .instructions {
                font-size: 16px;
                color: #475569;
                margin-top: 30px;
                font-weight: 600;
                direction: rtl;
              }
              .footer {
                margin-top: 40px;
                font-size: 14px;
                color: #94a3b8;
                font-weight: 500;
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <h1>${tableName}</h1>
              <div class="subtitle">امسح الكود للطلب</div>
              <img src="${qrUrl}" alt="QR Code for ${tableName}" />
              <div class="instructions">
                📱 امسح الكود بكاميرا الموبايل<br/>
                🍽️ تصفح القائمة واطلب<br/>
                ✨ استمتع بتجربة طلب سهلة
              </div>
              <div class="footer">Powered by RMS</div>
            </div>
          </body>
        </html>
      `)
            printWindow.document.close()
            setTimeout(() => {
                printWindow.print()
            }, 250)
        }
    }

    const printAllQRs = () => {
        const printWindow = window.open('', '_blank')
        if (printWindow) {
            const qrGrid = tables.map(table => `
        <div class="qr-card">
          <h2>${table.name}</h2>
          <div class="section-badge">${table.section?.name || 'N/A'}</div>
          <img src="${generateQRCode(table.id)}" alt="QR Code for ${table.name}" />
          <div class="capacity">السعة: ${table.capacity} أشخاص</div>
        </div>
      `).join('')

            printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>جميع أكواد QR</title>
            <style>
              @page { size: A4; margin: 1cm; }
              body {
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 20px;
              }
              h1 {
                text-align: center;
                font-size: 32px;
                font-weight: 900;
                color: #1e293b;
                margin-bottom: 40px;
              }
              .qr-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
              }
              .qr-card {
                border: 2px solid #e2e8f0;
                border-radius: 16px;
                padding: 20px;
                text-align: center;
                background: white;
                page-break-inside: avoid;
              }
              .qr-card h2 {
                font-size: 24px;
                font-weight: 900;
                color: #1e293b;
                margin: 0 0 8px 0;
              }
              .section-badge {
                display: inline-block;
                background: #1e293b;
                color: white;
                padding: 4px 12px;
                border-radius: 8px;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                margin-bottom: 16px;
              }
              .qr-card img {
                width: 100%;
                max-width: 200px;
                border: 2px solid #f1f5f9;
                border-radius: 12px;
                margin: 12px 0;
              }
              .capacity {
                font-size: 12px;
                color: #64748b;
                font-weight: 600;
                margin-top: 8px;
              }
            </style>
          </head>
          <body>
            <h1>🍽️ أكواد QR للطاولات</h1>
            <div class="qr-grid">
              ${qrGrid}
            </div>
          </body>
        </html>
      `)
            printWindow.document.close()
            setTimeout(() => {
                printWindow.print()
            }, 500)
        }
    }

    return (
        <div className="pb-16 space-y-8">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 bg-slate-50/40 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/50 shadow-2xl">
                <PageHeader
                    title="أكواد QR للطاولات"
                    subtitle="اطبع أكواد QR لكل طاولة لتمكين الطلب الذاتي"
                />

                <button
                    onClick={printAllQRs}
                    className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-600 hover:scale-105 transition-all duration-500"
                >
                    <Printer size={20} />
                    طباعة الكل
                </button>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                    <div className="h-16 w-16 animate-spin rounded-[2rem] border-4 border-slate-100 border-t-primary mb-8" />
                    <p className="text-xs font-black uppercase tracking-[0.5em] animate-pulse">جاري التحميل...</p>
                </div>
            ) : (
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {tables.map((table) => (
                        <div
                            key={table.id}
                            className="group relative flex flex-col rounded-2xl bg-white/40 backdrop-blur-xl p-6 border border-white/60 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 leading-none tracking-tighter">{table.name}</h3>
                                    <p className="text-xs font-bold text-slate-400 mt-1">{table.section?.name}</p>
                                </div>
                                <div className="size-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                                    <QrCode size={24} />
                                </div>
                            </div>

                            <div className="bg-white rounded-xl p-4 mb-4 border-2 border-slate-100">
                                <img
                                    src={generateQRCode(table.id)}
                                    alt={`QR Code for ${table.name}`}
                                    className="w-full rounded-lg"
                                />
                            </div>

                            <div className="text-xs text-slate-500 font-bold mb-4 text-center">
                                السعة: {table.capacity} أشخاص
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => downloadQR(table.id, table.name)}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all"
                                >
                                    <Download size={16} />
                                    تحميل
                                </button>
                                <button
                                    onClick={() => printQR(table.id, table.name)}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all"
                                >
                                    <Printer size={16} />
                                    طباعة
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
