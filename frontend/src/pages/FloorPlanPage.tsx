import { ChevronRight, LayoutGrid } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useMemo, useState, useEffect } from 'react'
import { fetchTables } from '../api/tables'
import { PageHeader } from '../components/PageHeader'
import type { RestaurantTable } from '../types'
import { useRealtime } from '../realtime/RealtimeProvider'
import { formatCurrency } from '../utils/format'

export const FloorPlanPage = () => {
  const { t } = useTranslation()
  const { isEnabled: isRealtimeEnabled } = useRealtime()
  const [activeSectionId, setActiveSectionId] = useState<number | 'ALL'>('ALL')

  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: fetchTables,
    refetchInterval: isRealtimeEnabled ? false : 5000,
  })

  // Group tables by section
  const { sections, tablesBySection } = useMemo(() => {
    const grouped: Record<string, RestaurantTable[]> = {}
    const sectionMap = new Map<number, string>()
    const noSectionId = -1

    tables.forEach(table => {
      const sectionId = table.section?.id || noSectionId
      const sectionName = table.section?.name || t('common.no_section')

      if (!grouped[sectionId]) {
        grouped[sectionId] = []
        sectionMap.set(sectionId, sectionName)
      }
      grouped[sectionId].push(table)
    })

    const sectionList = Array.from(sectionMap.entries()).map(([id, name]) => ({ id, name }))
    // Sort sections by name, put "No Section" last if exists
    sectionList.sort((a, b) => {
      if (a.id === noSectionId) return 1
      if (b.id === noSectionId) return -1
      return a.name.localeCompare(b.name)
    })

    return { sections: sectionList, tablesBySection: grouped }
  }, [tables, t])

  // Set initial active section
  useEffect(() => {
    if (activeSectionId === 'ALL' && sections.length > 0) {
      setActiveSectionId(sections[0].id)
    }
  }, [sections, activeSectionId])

  const stats = useMemo(() => ({
    total: tables.length,
    available: tables.filter(t => t.status === 'AVAILABLE').length,
    browsing: tables.filter(t => t.status === 'BROWSING').length,
    occupied: tables.filter(t => t.status === 'OCCUPIED').length,
  }), [tables])

  const activeTables = useMemo(() => {
    if (activeSectionId === 'ALL') return []
    return tablesBySection[activeSectionId] || []
  }, [activeSectionId, tablesBySection])

  return (
    <div className="pb-20 space-y-8" dir="rtl">
      {/* Header with Stats */}
      <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-xl">
        <PageHeader
          title={t('nav.floor_plan')}
          subtitle="إدارة الطاولات والأقسام"
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-200">
            <p className="text-xs font-bold text-slate-500 mb-1">المجموع</p>
            <p className="text-3xl font-black text-slate-900">{stats.total}</p>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-4 shadow-lg border border-emerald-200">
            <p className="text-xs font-bold text-emerald-700 mb-1">متاحة</p>
            <p className="text-3xl font-black text-emerald-600">{stats.available}</p>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4 shadow-lg border border-amber-200">
            <p className="text-xs font-bold text-amber-700 mb-1">يتصفح</p>
            <p className="text-3xl font-black text-amber-600">{stats.browsing}</p>
          </div>
          <div className="bg-rose-50 rounded-2xl p-4 shadow-lg border border-rose-200">
            <p className="text-xs font-bold text-rose-700 mb-1">مشغولة</p>
            <p className="text-3xl font-black text-rose-600">{stats.occupied}</p>
          </div>
        </div>
      </div>

      {/* Horizontal Section Tabs */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 mask-linear-right">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSectionId(section.id)}
            className={`whitespace-nowrap px-8 py-4 rounded-[1.5rem] text-sm font-black uppercase tracking-wider transition-all duration-300
              ${activeSectionId === section.id
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 scale-105'
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
              }
            `}
          >
            {section.name}
          </button>
        ))}
      </div>

      {/* Grid Layout */}
      <div>
        {tablesLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
          </div>
        ) : activeTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <LayoutGrid size={48} strokeWidth={1} className="mb-4 opacity-20" />
            <p className="text-sm font-bold opacity-50">لا يوجد طاولات في هذا القسم</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeTables.map((table) => {
              const activeOrder = table.orders?.find(o => o.status !== 'CLOSED')
              const isOccupied = table.status === 'OCCUPIED'
              const isBrowsing = table.status === 'BROWSING'

              return (
                <Link
                  key={table.id}
                  to={`/pos?table=${table.id}`}
                  className="group relative bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className={`size-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110
                                ${isOccupied ? 'bg-rose-500 shadow-rose-200' : isBrowsing ? 'bg-amber-500 shadow-amber-200' : 'bg-emerald-400 shadow-emerald-200'}
                            `}>
                      <span className="font-black text-2xl">{table.name.replace(/\D/g, '')}</span>
                    </div>

                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                                ${isOccupied ? 'bg-rose-50 text-rose-600 border-rose-100' : isBrowsing ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}
                            `}>
                      {isOccupied ? 'مشغولة' : isBrowsing ? 'يتصفح' : 'متاح'}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">{table.name}</h3>
                      {table.capacity && (
                        <p className="text-xs font-bold text-slate-400 mt-1">{table.capacity} مقاعد</p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                      {activeOrder ? (
                        <div>
                          <p className="text-lg font-black text-slate-900">{formatCurrency(activeOrder.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0)}</p>
                          <p className="text-[10px] font-bold text-slate-400">
                            {activeOrder.created_at ? Math.floor((new Date().getTime() - new Date(activeOrder.created_at).getTime()) / 60000) : 0} دقيقة
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-300">--</span>
                      )}

                      <div className="size-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                        <ChevronRight className="rtl:rotate-180" size={18} />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
