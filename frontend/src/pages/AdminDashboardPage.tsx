import { useState, useMemo, useEffect } from 'react'
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
import { Plus, Trash2, Search, RefreshCw, Layers, Users, Utensils, ClipboardList } from 'lucide-react'

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
    { key: 'menu', label: t('admin.menu_items'), icon: <Utensils size={18} /> },
    { key: 'tables', label: t('admin.tables'), icon: <Layers size={18} /> },
    { key: 'sections', label: t('admin.sections'), icon: <ClipboardList size={18} /> },
    { key: 'users', label: t('admin.users'), icon: <Users size={18} /> },
    { key: 'audits', label: t('admin.audits'), icon: <Search size={18} /> },
  ]

  return (
    <div className="min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        <PageHeader
          title={t('nav.management')}
          subtitle="System Configuration & Oversight"
        />

        {/* Improved Tab Navigation */}
        <div className="mt-6 mb-8 border-b border-slate-200">
          <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
            {sidebarItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key as AdminTab)}
                className={`flex items-center gap-2 px-5 py-3 rounded-t-lg text-sm font-medium transition-all border-b-2 whitespace-nowrap ${activeTab === item.key
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="animate-fade-in">
          {activeTab === 'menu' && (
            <Can I="manage_menu" fallback={<div className="p-8 card text-slate-400 italic">No permission to manage menu.</div>}>
              <MenuModule openConfirm={openConfirm} showError={showError} />
            </Can>
          )}
          {activeTab === 'tables' && (
            <Can I="manage_sections" fallback={<div className="p-8 card text-slate-400 italic">No permission to manage tables.</div>}>
              <TablesModule openConfirm={openConfirm} showError={showError} />
            </Can>
          )}
          {activeTab === 'sections' && (
            <Can I="manage_sections" fallback={<div className="p-8 card text-slate-400 italic">No permission to manage sections.</div>}>
              <SectionsModule openPrompt={openPrompt} openConfirm={openConfirm} showError={showError} />
            </Can>
          )}
          {activeTab === 'users' && (
            <Can I="manage_users" fallback={<div className="p-8 card text-slate-400 italic">No permission to manage users.</div>}>
              <UsersModule openConfirm={openConfirm} />
            </Can>
          )}
          {activeTab === 'audits' && (
            <Can I="manage_settings" fallback={<div className="p-8 card text-slate-400 italic">No permission to view logs.</div>}>
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
    name: '', price: 0, category: 'FOOD', prep_section_id: undefined, prep_time_minutes: 15, is_active: true, image_url: ''
  })

  // Automatically select the first prep section when they load
  useEffect(() => {
    if (prepSections.length > 0 && form.prep_section_id === undefined) {
      setForm(prev => ({ ...prev, prep_section_id: prepSections[0].id }))
    }
  }, [prepSections])

  const createMutation = useMutation({
    mutationFn: createMenuItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      setForm({
        name: '',
        price: 0,
        category: 'FOOD',
        prep_section_id: prepSections[0]?.id,
        prep_time_minutes: 15,
        is_active: true,
        image_url: ''
      })
    },
    onError: (error: any) => showError(error?.response?.data?.message || t('common.create_failed'))
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.prep_section_id) {
      showError("Please create a Prep Section first.")
      return
    }
    createMutation.mutate(form)
  }

  const deleteMutation = useMutation({
    mutationFn: deleteMenuItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu-items'] }),
    onError: (error: any) => showError(error?.response?.data?.message || t('common.delete_failed'))
  })

  const filtered = useMemo(() =>
    categoryFilter === 'ALL' ? items : items.filter(i => i.category === categoryFilter)
    , [items, categoryFilter])

  return (
    <div className="grid gap-8 lg:grid-cols-[380px,1fr]">
      <div className="card p-6 h-fit sticky top-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase mb-5 tracking-wide flex items-center gap-2">
          <Plus size={16} /> {t('admin.add_item')}
        </h3>
        <form className="space-y-4" onSubmit={handleCreate}>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Item Name</label>
            <input className="input-field" placeholder="e.g. Cheese Burger" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Price</label>
              <input type="number" step="any" className="input-field" placeholder="0.00" value={form.price || ''} onChange={e => setForm({ ...form, price: Number(e.target.value) })} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Prep (Min)</label>
              <input type="number" className="input-field" placeholder="15" value={form.prep_time_minutes || ''} onChange={e => setForm({ ...form, prep_time_minutes: Number(e.target.value) })} required />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Prep Section</label>
            <select className="input-field bg-white" value={form.prep_section_id || ''} onChange={e => setForm({ ...form, prep_section_id: Number(e.target.value) })}>
              {!form.prep_section_id && <option value="">Select Section...</option>}
              {prepSections?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Image URL (Optional)</label>
            <input className="input-field" placeholder="https://..." value={form.image_url || ''} onChange={e => setForm({ ...form, image_url: e.target.value })} />
          </div>

          <button
            type="submit"
            disabled={!form.prep_section_id || createMutation.isPending}
            className={`btn-primary w-full mt-2 ${(!form.prep_section_id || createMutation.isPending) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Plus size={18} />
            {createMutation.isPending ? t('common.loading') : t('admin.create_item_btn')}
          </button>
          {prepSections.length === 0 && (
            <p className="text-[10px] text-rose-500 font-medium mt-1">
              * Please create a Prep Section first.
            </p>
          )}
        </form>
      </div>

      <div className="space-y-6">
        <div className="flex gap-2 flex-wrap items-center bg-white p-2 rounded-xl border border-slate-200 w-fit">
          {['ALL', ...Array.from(new Set(items.map(i => i.category))).filter(Boolean).sort()].map(c => (
            <button key={c} onClick={() => setCategoryFilter(c)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${categoryFilter === c ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
              {c === 'ALL' ? t('common.total') : c}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {isLoading ? <p className="p-10 text-center text-slate-400 animate-pulse">{t('common.loading')}</p> : (filtered || []).map(item => (
            <div key={item.id} className="card p-4 flex gap-4 hover:border-indigo-300 group">
              <div className="h-20 w-20 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                {item.image_url ? <img src={item.image_url} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-xs text-slate-400 font-bold">N/A</div>}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 truncate text-sm">{item.name}</h4>
                  <div className="text-xs uppercase font-bold text-slate-400 mt-0.5">{t(`common.${item.category.toLowerCase()}`)} • {item.prep_section?.name}</div>
                </div>
                <div className="flex justify-between items-end mt-2">
                  <div className="text-indigo-600 font-bold text-sm bg-indigo-50 px-2 py-0.5 rounded-md">{formatCurrency(item.price)}</div>
                  <button onClick={() => openConfirm(t('common.delete'), `${t('common.delete_confirm')} (${item.name})`, () => deleteMutation.mutate(item.id))} className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"><Trash2 size={16} /></button>
                </div>
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
  const [formData, setFormData] = useState<{ name: string, capacity: number, section_id: number | undefined }>({ name: '', capacity: 4, section_id: undefined })

  // Dynamically set the first section when they load
  useEffect(() => {
    if (sec.length > 0 && formData.section_id === undefined) {
      setFormData(prev => ({ ...prev, section_id: sec[0].id }))
    }
  }, [sec])

  const createMutation = useMutation({
    mutationFn: createTable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      setFormData({ name: '', capacity: 4, section_id: sec[0]?.id })
    },
    onError: (error: any) => showError(error?.response?.data?.message || t('common.create_failed'))
  })

  const handleAddTable = () => {
    if (!formData.name) return;
    if (!formData.section_id) {
      showError("Please create a Table Area first.");
      return;
    }
    createMutation.mutate(formData as any);
  }

  return (
    <div className="space-y-8">
      <div className="card p-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase mb-4 tracking-wide flex items-center gap-2"><Plus size={16} /> Add New Table</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">{t('common.table_name')}</label>
            <input className="input-field" placeholder="e.g. T-12" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="w-32">
            <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">{t('common.capacity')}</label>
            <input type="number" className="input-field" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">{t('common.area')}</label>
            <select className="input-field bg-white" value={formData.section_id || ''} onChange={e => setFormData({ ...formData, section_id: Number(e.target.value) })}>
              {!formData.section_id && <option value="">Select Area...</option>}
              {sec?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <button
            onClick={handleAddTable}
            disabled={!formData.section_id || createMutation.isPending}
            className={`btn-primary h-[42px] px-8 ${(!formData.section_id || createMutation.isPending) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {createMutation.isPending ? '...' : t('common.add_new')}
          </button>
        </div>
        {sec.length === 0 && (
          <p className="text-xs text-rose-500 font-medium mt-2">
            * No Table Areas found. Please add an Area Section first.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {tables.map(t_item => (
          <div key={t_item.id} className="card p-5 flex justify-between items-center group hover:border-indigo-300">
            <div>
              <div className="font-bold text-slate-900 text-lg">{t_item.name}</div>
              <div className="text-xs font-medium text-slate-500 uppercase mt-1">{t('common.capacity')}: {t_item.capacity} <span className="text-slate-300">|</span> {t_item.section?.name}</div>
            </div>
            <button onClick={() => openConfirm(t('common.delete'), `${t('common.delete_confirm')} (${t_item.name})`, () => deleteTable(t_item.id).then(() => queryClient.invalidateQueries({ queryKey: ['tables'] })).catch((e: any) => showError(e?.response?.data?.message || 'Delete failed')))} className="text-slate-300 hover:text-rose-500 transition-colors p-2"><Trash2 size={18} /></button>
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
      <SectionCard
        title={t('admin.table_areas')}
        items={tSec}
        onAdd={() => openPrompt(t('admin.new_area'), (n) => {
          if (n) createTableSection({ name: n, is_active: true }).then(() => queryClient.invalidateQueries({ queryKey: ['table-sections'] }))
        })}
        onDelete={(id) => openConfirm(t('common.delete'), t('common.delete_confirm'), () => deleteTableSection(id).then(() => queryClient.invalidateQueries({ queryKey: ['table-sections'] })).catch((e: any) => showError(e?.response?.data?.message || 'Delete failed')))}
      />
      <SectionCard
        title={t('admin.prep_sections')}
        items={pSec}
        onAdd={() => openPrompt(t('admin.new_prep'), (n) => {
          if (n) createPrepSection({ name: n, is_active: true }).then(() => queryClient.invalidateQueries({ queryKey: ['prep-sections'] }))
        })}
        onDelete={(id) => openConfirm(t('common.delete'), t('common.delete_confirm'), () => deletePrepSection(id).then(() => queryClient.invalidateQueries({ queryKey: ['prep-sections'] })).catch((e: any) => showError(e?.response?.data?.message || 'Delete failed')))}
      />
    </div>
  )
}

const SectionCard = ({ title, items, onAdd, onDelete }: { title: string, items: any[], onAdd: () => void, onDelete: (id: number) => void }) => (
  <div className="card flex flex-col min-h-[400px]">
    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
      <h3 className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2"><Layers size={18} className="text-slate-400" /> {title}</h3>
      <button onClick={onAdd} className="text-indigo-600 hover:text-indigo-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1 bg-white border border-indigo-100 px-3 py-1.5 rounded-lg shadow-sm">
        <Plus size={14} /> Add New
      </button>
    </div>
    <div className="divide-y divide-slate-50 p-2">
      {items.map(s => (
        <div key={s.id} className="p-3 flex justify-between items-center text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors group">
          <span className="pl-2">{s.name}</span>
          <button onClick={() => onDelete(s.id)} className="text-slate-300 hover:text-rose-500 p-1.5 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
        </div>
      ))}
    </div>
  </div>
)

const UsersModule = ({ openConfirm }: { openConfirm: (t: string, d: string, cb: () => void) => void }) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: fetchRoles })
  const { data: prepSections = [] } = useQuery({ queryKey: ['prep-sections'], queryFn: fetchPrepSections })

  const [uForm, setUForm] = useState({ name: '', email: '', password: '', role_ids: [] as number[], prep_section_id: undefined as number | undefined })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setUForm({ name: '', email: '', password: '', role_ids: [], prep_section_id: undefined })
    }
  })

  return (
    <div className="grid gap-8 lg:grid-cols-[350px,1fr]">
      <div className="card p-6 h-fit sticky top-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase mb-5 tracking-wide flex items-center gap-2">
          <Users size={16} /> {t('admin.create_user_btn')}
        </h3>
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); createMutation.mutate(uForm) }}>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Full Name</label>
            <input className="input-field" placeholder="e.g. John Doe" value={uForm.name} onChange={e => setUForm({ ...uForm, name: e.target.value })} required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Email Address</label>
            <input type="email" className="input-field" placeholder="john@example.com" value={uForm.email} onChange={e => setUForm({ ...uForm, email: e.target.value })} required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Password</label>
            <input type="password" className="input-field" placeholder="••••••••" value={uForm.password} onChange={e => setUForm({ ...uForm, password: e.target.value })} required />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Operational Area (Optional)</label>
            <select className="input-field bg-white" value={uForm.prep_section_id || ''} onChange={e => setUForm({ ...uForm, prep_section_id: e.target.value ? Number(e.target.value) : undefined })}>
              <option value="">Full Access / None</option>
              {prepSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <p className="text-[10px] text-slate-400 italic mt-0.5">* Assign for Kitchen, Desserts, or Drinks staff.</p>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('admin.assign_roles')}</label>
            <div className="flex flex-wrap gap-2">
              {roles.map(r => (
                <label key={r.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${uForm.role_ids.includes(r.id) ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  <input type="checkbox" className="hidden" checked={uForm.role_ids.includes(r.id)} onChange={e => {
                    const cid = r.id;
                    setUForm({ ...uForm, role_ids: e.target.checked ? [...uForm.role_ids, cid] : uForm.role_ids.filter(i => i !== cid) })
                  }} />
                  {r.name}
                </label>
              ))}
            </div>
          </div>
          <button className="btn-primary w-full mt-4">{t('admin.create_user_btn')}</button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {users.map(u => (
          <div key={u.id} className="card p-5 group hover:border-indigo-300">
            <div className="flex justify-between items-start mb-3">
              <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <button onClick={() => openConfirm(t('common.delete'), `${t('common.delete_confirm')} (${u.name})`, () => deleteUser(u.id).then(() => queryClient.invalidateQueries({ queryKey: ['users'] })))} className="text-slate-300 hover:text-rose-500 transition-colors p-1"><Trash2 size={16} /></button>
            </div>

            <div className="font-bold text-slate-900 text-lg leading-tight mb-0.5">{u.name}</div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4">{u.email}</div>

            <div className="flex flex-wrap gap-1.5">
              {u.roles?.map(r => <span key={r.id} className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-wider border border-slate-200">{r.name}</span>)}
            </div>
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
    <div className="card overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2"><ClipboardList size={18} /> {t('common.audit_trail')}</h3>
        <button onClick={() => refetch()} className="btn-secondary h-9 text-xs">
          <RefreshCw size={14} /> {t('common.refresh')}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 whitespace-nowrap">{t('common.time')}</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 whitespace-nowrap">{t('common.action')}</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 whitespace-nowrap">{t('common.order')} / {t('common.table_name')}</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 w-full">{t('common.details')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? <tr><td colSpan={4} className="p-10 text-center text-slate-400">{t('common.loading')}</td></tr> : auditsResp?.data.map(log => (
              <tr key={`${log.type}-${log.id}`} className="text-sm hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4 text-slate-500 tabular-nums font-medium whitespace-nowrap">{new Date(log.occurred_at).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">{log.user_name}</div>
                  <div className="text-[10px] uppercase font-bold text-indigo-600 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded mt-1 w-fit">{log.action.replace(/_/g, ' ')}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${log.type === 'order' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                    {log.type === 'order' ? t('common.order') : t('common.system')}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-slate-600">
                  {log.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {auditsResp && (
        <div className="bg-white border-t border-slate-100 p-4 flex justify-between items-center text-xs font-bold text-slate-500">
          <div>{t('common.page')} {auditsResp.current_page} {t('common.of')} {auditsResp.last_page}</div>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white">{t('common.prev')}</button>
            <button disabled={page === auditsResp.last_page} onClick={() => setPage(p => p + 1)} className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white">{t('common.next')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
