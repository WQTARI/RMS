import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createMenuItem, deleteMenuItem, fetchMenuItems } from '../api/menuItems'
import {
  createPrepSection,
  createTableSection,
  deletePrepSection,
  deleteTableSection,
  fetchPrepSections,
  fetchTableSections,
} from '../api/sections'
import { createUser, deleteUser, fetchUsers } from '../api/users'
import { fetchRoles } from '../api/roles'
import { fetchAudits } from '../api/audits'
import { createTable, deleteTable, fetchTables } from '../api/tables'
import { PageHeader } from '../components/PageHeader'
import { Dialog } from '../components/Dialog'
import { formatCurrency } from '../utils/format'
import { Can } from '../components/Can'
import { useTranslation } from 'react-i18next'
import type { MenuItem } from '../types'

type AdminTab = 'menu' | 'tables' | 'users' | 'sections' | 'audits'

export const AdminDashboardPage = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<AdminTab>('menu')
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    type: 'info' | 'danger' | 'warning' | 'prompt';
    onConfirm: (val?: string) => void;
  }>({ isOpen: false, title: '', type: 'info', onConfirm: () => { } })

  const openPrompt = (title: string, onConfirm: (val?: string) => void) => {
    setDialog({ isOpen: true, title, type: 'prompt', onConfirm })
  }

  const openConfirm = (title: string, description: string, onConfirm: () => void) => {
    setDialog({ isOpen: true, title, description, type: 'danger', onConfirm })
  }

  const showError = (message: string) => {
    setDialog({ isOpen: true, title: t('common.error'), description: message, type: 'danger', onConfirm: () => { } })
  }

  const sidebarItems = [
    { key: 'menu', label: t('admin.menu_items'), icon: '🍽️' },
    { key: 'tables', label: t('admin.tables'), icon: '🪑' },
    { key: 'sections', label: t('admin.sections'), icon: '📍' },
    { key: 'users', label: t('admin.users'), icon: '👥' },
    { key: 'audits', label: t('admin.audits'), icon: '📜' },
  ]

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <PageHeader
          title={t('nav.management')}
          subtitle="Central Command & Control"
        />

        {/* Horizontal Navigation Tabs */}
        <div className="mt-8 flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-[24px] w-fit">
          {sidebarItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key as AdminTab)}
              className={`flex items-center gap-3 px-6 py-3.5 rounded-[20px] text-sm font-black uppercase tracking-widest transition-all ${activeTab === item.key
                ? 'bg-white text-slate-900 shadow-md ring-1 ring-black/5'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeTab === 'menu' && (
            <Can I="manage_menu" fallback={<div className="p-8 glass text-slate-400 italic">No permission to manage menu.</div>}>
              <MenuModule openConfirm={openConfirm} showError={showError} />
            </Can>
          )}
          {activeTab === 'tables' && (
            <Can I="manage_sections" fallback={<div className="p-8 glass text-slate-400 italic">No permission to manage tables.</div>}>
              <TablesModule openConfirm={openConfirm} showError={showError} />
            </Can>
          )}
          {activeTab === 'sections' && (
            <Can I="manage_sections" fallback={<div className="p-8 glass text-slate-400 italic">No permission to manage sections.</div>}>
              <SectionsModule openPrompt={openPrompt} openConfirm={openConfirm} showError={showError} />
            </Can>
          )}
          {activeTab === 'users' && (
            <Can I="manage_users" fallback={<div className="p-8 glass text-slate-400 italic">No permission to manage users.</div>}>
              <UsersModule openConfirm={openConfirm} />
            </Can>
          )}
          {activeTab === 'audits' && (
            <Can I="manage_settings" fallback={<div className="p-8 glass text-slate-400 italic">No permission to view logs.</div>}>
              <AuditsModule />
            </Can>
          )}
        </div>
      </div>

      <Dialog
        isOpen={dialog.isOpen}
        title={dialog.title}
        description={dialog.description}
        type={dialog.type}
        onClose={() => setDialog(p => ({ ...p, isOpen: false }))}
        onConfirm={dialog.onConfirm}
      />
    </div>
  )
}

/* --- MODULES --- */

const MenuModule = ({ openConfirm, showError }: { openConfirm: (t: string, d: string, cb: () => void) => void, showError: (m: string) => void }) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const { data: items = [], isLoading } = useQuery({ queryKey: ['menu-items'], queryFn: () => fetchMenuItems() })
  const { data: prepSections = [] } = useQuery({ queryKey: ['prep-sections'], queryFn: fetchPrepSections })

  const [form, setForm] = useState<Partial<MenuItem>>({
    name: '', price: 0, category: 'FOOD', prep_section_id: 1, prep_time_minutes: 15, is_active: true, image_url: ''
  })

  const createMutation = useMutation({
    mutationFn: createMenuItem,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['menu-items'] }); setForm({ name: '', price: 0, category: 'FOOD', prep_section_id: 1, prep_time_minutes: 15, is_active: true, image_url: '' }) },
    onError: (error: any) => showError(error?.response?.data?.message || t('common.create_failed'))
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMenuItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu-items'] }),
    onError: (error: any) => showError(error?.response?.data?.message || t('common.delete_failed'))
  })

  const filtered = useMemo(() =>
    categoryFilter === 'ALL' ? items : items.filter(i => i.category === categoryFilter)
    , [items, categoryFilter])

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr,2fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm h-fit">
        <h3 className="text-lg font-black text-slate-800 uppercase mb-4 tracking-tight">{t('admin.add_item')}</h3>
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); createMutation.mutate(form) }}>
          <input className="w-full rounded-2xl border p-3 text-sm" placeholder={t('common.item_name')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <div className="flex gap-3">
            <input type="number" step="any" className="flex-1 rounded-2xl border p-3 text-sm" placeholder={t('common.price')} value={form.price || ''} onChange={e => setForm({ ...form, price: Number(e.target.value) })} required />
            <input type="number" className="flex-1 rounded-2xl border p-3 text-sm" placeholder={t('common.prep_min')} value={form.prep_time_minutes || ''} onChange={e => setForm({ ...form, prep_time_minutes: Number(e.target.value) })} required />
          </div>
          <select className="w-full rounded-2xl border p-3 text-sm" value={form.prep_section_id} onChange={e => setForm({ ...form, prep_section_id: Number(e.target.value) })}>
            <option value="">{t('common.select_area')}</option>
            {prepSections?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input className="w-full rounded-2xl border p-3 text-sm" placeholder="Image URL" value={form.image_url || ''} onChange={e => setForm({ ...form, image_url: e.target.value })} />
          <button className="w-full rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-xl">{t('admin.create_item_btn')}</button>
        </form>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {['ALL', ...Array.from(new Set(items.map(i => i.category))).filter(Boolean).sort()].map(c => (
            <button key={c} onClick={() => setCategoryFilter(c)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${categoryFilter === c ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>
              {c === 'ALL' ? t('common.total') : c}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {isLoading ? <p>{t('common.loading')}</p> : (filtered || []).map(item => (
            <div key={item.id} className="rounded-3xl border border-slate-100 bg-white p-4 flex gap-4 shadow-sm hover:shadow-md transition-all group">
              <div className="h-20 w-20 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                {item.image_url ? <img src={item.image_url} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">NO IMG</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 truncate text-base">{item.name}</h4>
                  <button onClick={() => openConfirm(t('common.delete'), `${t('common.delete_confirm')} (${item.name})`, () => deleteMutation.mutate(item.id))} className="text-xs font-bold text-rose-300 hover:text-rose-500 uppercase tracking-widest">{t('common.delete')}</button>
                </div>
                <div className="text-emerald-600 font-bold text-sm mt-1">{formatCurrency(item.price)}</div>
                <div className="text-xs uppercase font-bold text-slate-400 mt-1">{t(`common.${item.category.toLowerCase()}`)} • {item.prep_section?.name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div >
  )
}

const TablesModule = ({ openConfirm, showError }: { openConfirm: (t: string, d: string, cb: () => void) => void, showError: (m: string) => void }) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: tables = [] } = useQuery({ queryKey: ['tables'], queryFn: fetchTables })
  const { data: sec = [] } = useQuery({ queryKey: ['table-sections'], queryFn: fetchTableSections })

  const createMutation = useMutation({
    mutationFn: createTable,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] }),
    onError: (error: any) => showError(error?.response?.data?.message || t('common.create_failed'))
  })

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]"><label className="text-xs font-bold text-slate-400 uppercase">{t('common.table_name')}</label><input id="tableName" className="w-full rounded-xl border p-2 text-sm mt-1" placeholder="e.g. T-01" /></div>
        <div className="w-32"><label className="text-xs font-bold text-slate-400 uppercase">{t('common.capacity')}</label><input id="tableCap" type="number" className="w-full rounded-xl border p-2 text-sm mt-1" defaultValue={4} /></div>
        <div className="flex-1 min-w-[200px]"><label className="text-xs font-bold text-slate-400 uppercase">{t('common.area')}</label>
          <select id="tableSec" className="w-full rounded-xl border p-2 text-sm mt-1">
            <option value="">{t('common.select_area')}</option>
            {sec?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></div>
        <button onClick={() => {
          const name = (document.getElementById('tableName') as HTMLInputElement).value;
          const cap = Number((document.getElementById('tableCap') as HTMLInputElement).value);
          const sid = Number((document.getElementById('tableSec') as HTMLSelectElement).value);
          if (name) createMutation.mutate({ name, capacity: cap, section_id: sid });
        }} className="bg-slate-900 text-white font-bold h-10 px-6 rounded-xl hover:bg-slate-800">{t('common.add_new')}</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tables.map(t_item => (
          <div key={t_item.id} className="bg-white border border-slate-100 rounded-3xl p-5 flex justify-between items-center shadow-sm hover:shadow-md transition-all">
            <div><div className="font-black text-slate-900 text-lg">{t_item.name}</div><div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.capacity')}: {t_item.capacity} • {t_item.section?.name}</div></div>
            <button onClick={() => openConfirm(t('common.delete'), `${t('common.delete_confirm')} (${t_item.name})`, () => deleteTable(t_item.id).then(() => queryClient.invalidateQueries({ queryKey: ['tables'] })).catch((e: any) => showError(e?.response?.data?.message || 'Delete failed')))} className="text-xs font-bold text-rose-300 hover:text-rose-500 uppercase tracking-widest">{t('common.delete')}</button>
          </div>
        ))}
      </div>
    </div>
  )
}

const SectionsModule = ({ openPrompt, openConfirm, showError }: { openPrompt: (t: string, cb: (v?: string) => void) => void, openConfirm: (t: string, d: string, cb: () => void) => void, showError: (m: string) => void }) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: tSec = [] } = useQuery({ queryKey: ['table-sections'], queryFn: fetchTableSections })
  const { data: pSec = [] } = useQuery({ queryKey: ['prep-sections'], queryFn: fetchPrepSections })

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <h3 className="font-black text-slate-900 uppercase tracking-tight mb-4 flex justify-between">{t('admin.table_areas')} <button onClick={() => {
          openPrompt(t('admin.new_area'), (n) => {
            if (n) createTableSection({ name: n, is_active: true }).then(() => queryClient.invalidateQueries({ queryKey: ['table-sections'] }))
          })
        }} className="text-indigo-600 text-xs font-bold font-black tracking-widest">+ {t('common.add_new')}</button></h3>
        <div className="divide-y text-base">
          {tSec.map(s => <div key={s.id} className="py-3 flex justify-between text-sm font-bold text-slate-700"><span>{s.name}</span><button onClick={() => openConfirm(t('common.delete'), t('common.delete_confirm'), () => deleteTableSection(s.id).then(() => queryClient.invalidateQueries({ queryKey: ['table-sections'] })).catch((e: any) => showError(e?.response?.data?.message || 'Delete failed')))} className="text-xs font-black text-rose-300 hover:text-rose-500 transition-colors uppercase tracking-widest">×</button></div>)}
        </div>
      </div>
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <h3 className="font-black text-slate-900 uppercase tracking-tight mb-4 flex justify-between">{t('admin.prep_sections')} <button onClick={() => {
          openPrompt(t('admin.new_prep'), (n) => {
            if (n) createPrepSection({ name: n, is_active: true }).then(() => queryClient.invalidateQueries({ queryKey: ['prep-sections'] }))
          })
        }} className="text-indigo-600 text-xs font-bold font-black tracking-widest">+ {t('common.add_new')}</button></h3>
        <div className="divide-y text-base">
          {pSec.map(s => <div key={s.id} className="py-3 flex justify-between text-sm font-bold text-slate-700"><span>{s.name}</span><button onClick={() => openConfirm(t('common.delete'), t('common.delete_confirm'), () => deletePrepSection(s.id).then(() => queryClient.invalidateQueries({ queryKey: ['prep-sections'] })).catch((e: any) => showError(e?.response?.data?.message || 'Delete failed')))} className="text-xs font-black text-rose-300 hover:text-rose-500 transition-colors uppercase tracking-widest">×</button></div>)}
        </div>
      </div>
    </div>
  )
}

const UsersModule = ({ openConfirm }: { openConfirm: (t: string, d: string, cb: () => void) => void }) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: fetchRoles })

  const [uForm, setUForm] = useState({ name: '', email: '', password: '', role_ids: [] as number[] })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setUForm({ name: '', email: '', password: '', role_ids: [] }) }
  })

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr,2fr]">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm h-fit">
        <h3 className="text-lg font-black text-slate-900 uppercase mb-4 tracking-tight">{t('admin.create_user_btn')}</h3>
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); createMutation.mutate(uForm) }}>
          <input className="w-full rounded-2xl border p-3 text-sm" placeholder={t('common.full_name')} value={uForm.name} onChange={e => setUForm({ ...uForm, name: e.target.value })} required />
          <input type="email" className="w-full rounded-2xl border p-3 text-sm" placeholder={t('common.email')} value={uForm.email} onChange={e => setUForm({ ...uForm, email: e.target.value })} required />
          <input type="password" className="w-full rounded-2xl border p-3 text-sm" placeholder={t('common.password')} value={uForm.password} onChange={e => setUForm({ ...uForm, password: e.target.value })} required />

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('admin.assign_roles')}</label>
            <div className="flex flex-wrap gap-2">
              {roles.map(r => (
                <label key={r.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${uForm.role_ids.includes(r.id) ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white'}`}>
                  <input type="checkbox" className="hidden" checked={uForm.role_ids.includes(r.id)} onChange={e => {
                    const cid = r.id;
                    setUForm({ ...uForm, role_ids: e.target.checked ? [...uForm.role_ids, cid] : uForm.role_ids.filter(i => i !== cid) })
                  }} />
                  {r.name}
                </label>
              ))}
            </div>
          </div>
          <button className="w-full rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-xl mt-4">{t('admin.create_user_btn')}</button>
        </form>
      </div>

      <div className="space-y-4">
        {users.map(u => (
          <div key={u.id} className="bg-white border border-slate-100 rounded-3xl p-5 flex justify-between items-center shadow-sm hover:shadow-md transition-all">
            <div>
              <div className="font-black text-slate-900 text-lg leading-none mb-1">{u.name}</div>
              <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">{u.email}</div>
              <div className="flex gap-1 mt-3">
                {u.roles?.map(r => <span key={r.id} className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-500 font-bold text-xs uppercase tracking-widest">{r.name}</span>)}
              </div>
            </div>
            <button onClick={() => openConfirm(t('common.delete'), `${t('common.delete_confirm')} (${u.name})`, () => deleteUser(u.id).then(() => queryClient.invalidateQueries({ queryKey: ['users'] })))} className="text-xs font-black text-rose-300 hover:text-rose-500 uppercase tracking-widest">{t('common.delete')}</button>
          </div>
        ))}
      </div>
    </div>
  )
}

const AuditsModule = () => {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const { data: auditsResp, isLoading, refetch } = useQuery({ queryKey: ['audits', page], queryFn: () => fetchAudits(page) })

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
        <h3 className="font-black text-slate-800 uppercase tracking-tight">{t('common.audit_trail')}</h3>
        <button onClick={() => refetch()} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">🔄 {t('common.refresh')}</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-4 text-xs font-black uppercase text-slate-400">{t('common.time')}</th>
              <th className="px-6 py-4 text-xs font-black uppercase text-slate-400">{t('common.action')}</th>
              <th className="px-6 py-4 text-xs font-black uppercase text-slate-400">{t('common.order')} / {t('common.table_name')}</th>
              <th className="px-6 py-4 text-xs font-black uppercase text-slate-400">{t('common.details')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? <tr><td colSpan={4} className="p-10 text-center text-slate-400">{t('common.loading')}</td></tr> : auditsResp?.data.map(log => (
              <tr key={`${log.type}-${log.id}`} className="text-sm">
                <td className="px-6 py-4 text-slate-500 tabular-nums">{new Date(log.occurred_at).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">{log.user_name}</div>
                  <div className="text-xs uppercase font-bold text-indigo-500 px-2 py-0.5 bg-indigo-50 rounded-md w-fit mt-1">{log.action.replace(/_/g, ' ')}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${log.type === 'order' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                    {log.type === 'order' ? t('common.order') : t('common.system')}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-slate-700 text-sm">
                  {log.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {auditsResp && (
        <div className="bg-slate-50 p-4 flex justify-between items-center text-xs font-bold text-slate-500">
          <div>{t('common.page')} {auditsResp.current_page} {t('common.of')} {auditsResp.last_page}</div>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-white rounded-xl shadow-sm disabled:opacity-50">{t('common.prev')}</button>
            <button disabled={page === auditsResp.last_page} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-white rounded-xl shadow-sm disabled:opacity-50">{t('common.next')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
