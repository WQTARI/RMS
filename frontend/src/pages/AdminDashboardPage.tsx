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
import { RestaurantSettingsPage } from './admin/RestaurantSettingsPage'
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
import { Plus, Trash2, Search, RefreshCw, Layers, Users, Utensils, ClipboardList, Store } from 'lucide-react'

type AdminTab = 'menu' | 'tables' | 'users' | 'sections' | 'audits' | 'restaurant'

const getCategoryForSection = (name: string) => {
  const n = name.toUpperCase().trim()
  if (n.includes('DESSERT')) return 'DESSERT'
  if (n.includes('DRINK') || n.includes('BAR')) return 'DRINK'
  return 'FOOD'
}

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
    { key: 'restaurant', label: t('admin.restaurant'), icon: <Store size={18} /> },
  ]

  return (
    <div className="pb-32">
      <div className="max-w-[1600px] mx-auto px-10">
        <PageHeader
          title={t('nav.management')}
          subtitle="System Configuration & Oversight"
        />

        {/* High-Fidelity Pill Navigation */}
        <div className="mt-8 mb-12 flex justify-center z-40">
          <div className="glass flex gap-2 p-3 rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 border-white/80 bg-white/60 backdrop-blur-3xl overflow-x-auto no-scrollbar">
            {sidebarItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key as AdminTab)}
                className={`flex items-center gap-3 px-8 py-4 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 whitespace-nowrap ${activeTab === item.key
                  ? 'bg-slate-900 text-white shadow-2xl scale-105'
                  : 'text-slate-500 hover:text-indigo-600 hover:bg-white/60'
                  }`}
              >
                <div className={`${activeTab === item.key ? 'text-indigo-400' : 'text-slate-400'}`}>
                  {item.icon}
                </div>
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
          {activeTab === 'restaurant' && (
            <Can I="manage_settings" fallback={<div className="p-8 card text-slate-400 italic">No permission to manage restaurant settings.</div>}>
              <RestaurantSettingsPage />
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
  const { data: items = [], isLoading, isError } = useQuery({ queryKey: ['menu-items'], queryFn: () => fetchMenuItems() })
  const { data: prepSections = [] } = useQuery({ queryKey: ['prep-sections'], queryFn: fetchPrepSections })

  const [form, setForm] = useState<Partial<MenuItem>>({
    name: '', price: 0, category: 'FOOD', prep_section_id: undefined, prep_time_minutes: 15, is_active: true, image_url: ''
  })
  const [imageFile, setImageFile] = useState<File | null>(null)

  // Automatically set initial category and prep section mapping
  useEffect(() => {
    if (prepSections.length > 0 && form.prep_section_id === undefined) {
      const defaultSection = prepSections.find(s => s.name.toUpperCase() === 'KITCHEN') || prepSections[0]
      setForm(prev => ({
        ...prev,
        prep_section_id: defaultSection.id,
        category: getCategoryForSection(defaultSection.name) as any
      }))
    }
  }, [prepSections])

  const createMutation = useMutation({
    mutationFn: createMenuItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      // Reset form but keep the last category/section to make it easier to add multiple items
      setForm(prev => ({
        ...prev,
        name: '',
        price: 0,
        image_url: ''
      }))
      setImageFile(null)
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
    <div className="grid gap-12 lg:grid-cols-[420px,1fr] items-start">
      {/* Form Section */}
      <div className="glass p-10 rounded-[3rem] border-white/60 shadow-2xl shadow-indigo-500/5 bg-white/40">
        <div className="flex items-center gap-4 mb-10">
          <div className="size-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Plus size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
              {t('admin.add_item')}
            </h3>
            <div className="h-1 w-12 bg-gradient-to-r from-indigo-500 to-transparent rounded-full" />
          </div>
        </div>

        <form className="space-y-8" onSubmit={handleCreate}>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Item Name</label>
            <input
              className="w-full px-6 py-5 bg-white/60 border border-white/80 rounded-2xl text-sm font-black uppercase tracking-tight placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all duration-500 shadow-inner outline-none"
              placeholder="e.g. Cheese Burger"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Price</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  className="w-full pl-10 pr-6 py-5 bg-white/60 border border-white/80 rounded-2xl text-sm font-black tracking-tight focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all duration-500 shadow-inner outline-none"
                  placeholder="0.00"
                  value={form.price || ''}
                  onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                  required
                />
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black">€</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Prep (Min)</label>
              <input
                type="number"
                className="w-full px-6 py-5 bg-white/60 border border-white/80 rounded-2xl text-sm font-black tracking-tight focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all duration-500 shadow-inner outline-none"
                placeholder="15"
                value={form.prep_time_minutes || ''}
                onChange={e => setForm({ ...form, prep_time_minutes: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{t('common.category')} & {t('admin.prep_sections')}</label>
            <select
              className="w-full px-6 py-5 bg-white border border-white/80 rounded-2xl text-xs font-black uppercase tracking-widest focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-inner"
              value={`${form.category}:${form.prep_section_id}`}
              onChange={e => {
                const [_, sidRaw] = e.target.value.split(':');
                const sid = Number(sidRaw);
                const section = prepSections.find(s => s.id === sid);
                const category = section ? getCategoryForSection(section.name) : 'FOOD';

                console.log('Selection Changed:', { value: e.target.value, sectionName: section?.name, mapping: category });

                setForm(prev => ({ ...prev, category: category as any, prep_section_id: sid }));
              }}
            >
              {prepSections.map(s => {
                const category = getCategoryForSection(s.name);
                return (
                  <option key={s.id} value={`${category}:${s.id}`}>
                    {s.name}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Image (URL or File)</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-6 py-5 bg-white/60 border border-white/80 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-inner"
                  placeholder="https://..."
                  value={form.image_url || ''}
                  onChange={e => setForm({ ...form, image_url: e.target.value })}
                />
                <label className="flex items-center justify-center px-4 py-3 bg-white border border-white/80 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) setImageFile(file)
                    }}
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {imageFile ? 'File Selected' : 'Choose File'}
                  </span>
                </label>
              </div>
              {imageFile && <p className="text-[10px] text-indigo-500 font-bold ml-1">Selected: {imageFile.name}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={!form.prep_section_id || createMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              if (!form.prep_section_id) return;

              if (imageFile) {
                const formData = new FormData();
                formData.append('name', form.name!);
                formData.append('price', String(form.price));
                formData.append('category', form.category!);
                formData.append('prep_section_id', String(form.prep_section_id));
                formData.append('prep_time_minutes', String(form.prep_time_minutes));
                formData.append('is_active', '1');
                if (form.image_url) formData.append('image_url', form.image_url);
                formData.append('image', imageFile);
                createMutation.mutate(formData);
              } else {
                createMutation.mutate(form as any);
              }
            }}
            className="group w-full flex items-center justify-center gap-4 py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-600 hover:scale-105 active:scale-95 transition-all duration-500 disabled:opacity-30 disabled:hover:scale-100"
          >
            {createMutation.isPending ? <RefreshCw className="size-5 animate-spin" /> : <Plus size={20} />}
            {createMutation.isPending ? t('common.loading') : t('admin.create_item_btn')}
          </button>
          {prepSections.length === 0 && (
            <p className="text-[10px] text-rose-500 font-bold mt-2 text-center uppercase tracking-widest animate-pulse">
              * Please create a Prep Section first.
            </p>
          )}
        </form>
      </div>

      <div className="space-y-8 min-w-0">
        <div className="glass flex gap-2 p-2 rounded-2xl border-white/60 shadow-xl shadow-indigo-500/5 w-fit overflow-x-auto overflow-y-hidden no-scrollbar">
          {['ALL', 'FOOD', 'DESSERT', 'DRINK'].map(c => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${categoryFilter === c ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-indigo-600 hover:bg-white'}`}
            >
              {c === 'ALL' ? t('common.total') : t(`common.${c.toLowerCase()}`)}
            </button>
          ))}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square bg-white/20 rounded-[2.5rem] animate-pulse border border-white/40" />
            ))
          ) : isError ? (
            <div className="col-span-full p-12 text-center glass rounded-[3rem] border-rose-200 bg-rose-50/50">
              <p className="text-sm font-black text-rose-600 uppercase tracking-widest leading-none mb-2">Failed to load content</p>
              <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest">Please check your connection or permissions</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full p-20 text-center glass rounded-[3rem] border-dashed border-2 bg-white/10 shrink-0">
              <div className="size-20 bg-white shadow-xl shadow-slate-200/50 rounded-[2rem] flex items-center justify-center text-4xl mx-auto opacity-40 mb-6">
                🍽️
              </div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">
                {t('pos.no_items_in_category')}
              </p>
            </div>
          ) : filtered.map(item => (
            <div key={item.id} className="group relative glass rounded-[2.5rem] p-6 border-white/80 hover:bg-white/80 transition-all duration-500 shadow-xl shadow-indigo-500/5 overflow-hidden">
              <div className="flex gap-6 relative z-10">
                <div className="size-24 rounded-2xl bg-white shadow-inner overflow-hidden shrink-0 border border-white/80">
                  {item.image_url ? (
                    <img src={item.image_url} className="size-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="size-full flex items-center justify-center text-[10px] text-slate-300 font-black uppercase tracking-widest">No Img</div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                  <div>
                    <h4 className="font-black text-slate-800 truncate text-base uppercase tracking-tight mb-1">{item.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-md bg-slate-900 text-white tracking-widest">{t(`common.${item.category.toLowerCase()}`)}</span>
                      <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest truncate">{item.prep_section?.name}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-indigo-600 font-black text-base tabular-nums">{formatCurrency(item.price)}</div>
                    <button
                      onClick={() => openConfirm(t('common.delete'), `${t('common.delete_confirm')} (${item.name})`, () => deleteMutation.mutate(item.id))}
                      className="size-10 rounded-xl bg-white text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all duration-300 flex items-center justify-center border border-white group-hover:shadow-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
              {/* Decorative aura */}
              <div className="absolute -bottom-10 -right-10 size-24 bg-indigo-500/5 rounded-full blur-3xl" />
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
    <div className="space-y-12">
      <div className="glass p-10 rounded-[3rem] border-white/60 shadow-2xl shadow-indigo-500/5 bg-white/40">
        <div className="flex items-center gap-4 mb-10">
          <div className="size-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Plus size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Add New Table</h3>
            <div className="h-1 w-12 bg-gradient-to-r from-emerald-500 to-transparent rounded-full" />
          </div>
        </div>

        <div className="flex flex-wrap gap-8 items-end">
          <div className="flex-1 min-w-[250px] space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{t('common.table_name')}</label>
            <input
              className="w-full px-6 py-5 bg-white/60 border border-white/80 rounded-2xl text-sm font-black uppercase tracking-tight placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all duration-500 shadow-inner outline-none"
              placeholder="e.g. T-12"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="w-40 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{t('common.capacity')}</label>
            <input
              type="number"
              className="w-full px-6 py-5 bg-white/60 border border-white/80 rounded-2xl text-sm font-black tracking-tight focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all duration-500 shadow-inner outline-none"
              value={formData.capacity}
              onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
            />
          </div>
          <div className="flex-1 min-w-[250px] space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{t('common.area')}</label>
            <select className="w-full px-6 py-5 bg-white border border-white/80 rounded-2xl text-xs font-black uppercase tracking-widest focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-inner" value={formData.section_id || ''} onChange={e => setFormData({ ...formData, section_id: Number(e.target.value) })}>
              {!formData.section_id && <option value="">Select Area...</option>}
              {sec?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <button
            onClick={handleAddTable}
            disabled={!formData.section_id || createMutation.isPending}
            className="h-[62px] px-12 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-all duration-500 disabled:opacity-30"
          >
            {createMutation.isPending ? <RefreshCw className="size-5 animate-spin" /> : t('common.add_new')}
          </button>
        </div>
        {sec.length === 0 && (
          <p className="text-[10px] text-rose-500 font-bold mt-4 uppercase tracking-widest text-center animate-pulse">
            * No Table Areas found. Please add an Area Section first.
          </p>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {tables.map(t_item => (
          <div key={t_item.id} className="relative glass rounded-[2.5rem] p-8 border-white/80 hover:bg-white/80 transition-all duration-500 shadow-xl shadow-indigo-500/5 group overflow-hidden">
            <div className="flex items-center justify-between relative z-10">
              <div className="size-16 rounded-[1.25rem] bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-2xl group-hover:scale-110 transition-transform duration-500">
                {t_item.name}
              </div>
              <button onClick={() => openConfirm(t('common.delete'), `${t('common.delete_confirm')} (${t_item.name})`, () => deleteTable(t_item.id).then(() => queryClient.invalidateQueries({ queryKey: ['tables'] })).catch((e: any) => showError(e?.response?.data?.message || 'Delete failed')))} className="size-10 rounded-xl bg-white text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all duration-300 flex items-center justify-center border border-white group-hover:shadow-lg">
                <Trash2 size={18} />
              </button>
            </div>
            <div className="mt-8 space-y-1">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.area')}</div>
              <div className="text-sm font-black text-slate-800 uppercase tracking-tight truncate">{t_item.section?.name}</div>
            </div>
            <div className="mt-6 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-white/40 p-3 rounded-xl border border-white/60 shadow-inner">
              <span>Cap: {t_item.capacity}</span>
              <div className="size-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
            </div>
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
    <div className="grid gap-12 grid-cols-1 xl:grid-cols-2">
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
  <div className="glass rounded-[3rem] border-white/60 shadow-2xl shadow-indigo-500/5 bg-white/40 overflow-hidden min-h-[500px] flex flex-col">
    <div className="p-10 border-b border-white/60 flex justify-between items-center bg-white/40">
      <div className="space-y-1">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none flex items-center gap-3">
          <Layers size={20} className="text-slate-400" /> {title}
        </h3>
        <div className="h-1 w-12 bg-gradient-to-r from-indigo-500 to-transparent rounded-full" />
      </div>
      <button onClick={onAdd} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-600 hover:scale-105 transition-all duration-500">
        <Plus size={14} /> Add New
      </button>
    </div>
    <div className="p-6 space-y-4">
      {items.map(s => (
        <div key={s.id} className="flex justify-between items-center p-6 bg-white/60 rounded-3xl border border-white/80 transition-all duration-500 hover:bg-white hover:shadow-lg group">
          <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{s.name}</span>
          <button onClick={() => onDelete(s.id)} className="size-10 rounded-xl bg-white text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all duration-300 flex items-center justify-center border border-white opacity-0 group-hover:opacity-100 group-hover:shadow-md">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      {items.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-20 text-slate-400">
          <ClipboardList size={48} className="mb-4" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">No sections yet</p>
        </div>
      )}
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

  const selectedRoleNames = roles.filter(r => uForm.role_ids.includes(r.id)).map(r => r.name);
  const showPrepSection = selectedRoleNames.some(name => ['Kitchen', 'Desserts', 'Drinks', 'Waiters'].includes(name));

  return (
    <div className="grid gap-12 lg:grid-cols-[400px,1fr] items-start">
      <div className="glass p-10 rounded-[3.5rem] border-white/60 shadow-2xl shadow-indigo-500/5 bg-white/40">
        {/* ... existing header ... */}
        <div className="flex items-center gap-4 mb-10">
          <div className="size-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Users size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
              {t('admin.create_user_btn')}
            </h3>
            <div className="h-1 w-12 bg-gradient-to-r from-indigo-500 to-transparent rounded-full" />
          </div>
        </div>

        <form className="space-y-8" onSubmit={e => { e.preventDefault(); createMutation.mutate(uForm) }}>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
            <input className="w-full px-6 py-5 bg-white/60 border border-white/80 rounded-2xl text-sm font-black uppercase tracking-tight placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all duration-500 shadow-inner outline-none" placeholder="e.g. John Doe" value={uForm.name} onChange={e => setUForm({ ...uForm, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email Address</label>
            <input type="email" className="w-full px-6 py-5 bg-white/60 border border-white/80 rounded-2xl text-sm font-black placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all duration-500 shadow-inner outline-none" placeholder="john@example.com" value={uForm.email} onChange={e => setUForm({ ...uForm, email: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Password</label>
            <input type="password" className="w-full px-6 py-5 bg-white/60 border border-white/80 rounded-2xl text-sm font-black placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all duration-500 shadow-inner outline-none" placeholder="••••••••" value={uForm.password} onChange={e => setUForm({ ...uForm, password: e.target.value })} required />
          </div>

          {showPrepSection && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-500">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Operational Area (Prep Section)</label>
              <select className="w-full px-6 py-5 bg-white border border-white/80 rounded-2xl text-xs font-black uppercase tracking-widest focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-inner" value={uForm.prep_section_id || ''} onChange={e => setUForm({ ...uForm, prep_section_id: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">Full Access / None</option>
                {prepSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-4 pt-4 border-t border-white/60">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-1">{t('admin.assign_roles')}</label>
            <div className="flex flex-wrap gap-3">
              {roles.map(r => {
                const isSelected = uForm.role_ids.includes(r.id);
                return (
                  <label key={r.id} className={`flex items-center gap-3 px-5 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all duration-500 ${isSelected ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-105' : 'bg-white border-white/80 text-slate-500 hover:bg-white hover:border-indigo-200 shadow-sm'}`}>
                    <input
                      type="radio"
                      name="role_selection"
                      className="hidden"
                      checked={isSelected}
                      onChange={e => {
                        if (e.target.checked) {
                          setUForm({ ...uForm, role_ids: [r.id] })
                        }
                      }}
                    />
                    {isSelected && <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                    {r.name}
                  </label>
                );
              })}
            </div>
          </div>
          <button className="h-[62px] w-full bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-600 hover:scale-105 active:scale-95 transition-all duration-500 mt-6">
            {t('admin.create_user_btn')}
          </button>
        </form>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {users.map(u => (
          <div key={u.id} className="group glass rounded-[2.5rem] p-8 border-white/80 hover:bg-white/80 transition-all duration-700 shadow-xl shadow-indigo-500/5 overflow-hidden flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="size-24 rounded-[2rem] bg-indigo-600 text-white flex items-center justify-center font-black text-4xl shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-700">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-2 -right-2 size-8 bg-emerald-500 border-4 border-white rounded-full shadow-lg shadow-emerald-500/30" />
            </div>

            <div className="space-y-1 mb-8">
              <div className="font-black text-slate-900 text-2xl tracking-tighter uppercase truncate w-full px-4">{u.name}</div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{u.email}</div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {u.roles?.map(r => <span key={r.id} className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest shadow-xl">{r.name}</span>)}
            </div>

            <button
              onClick={() => openConfirm(t('common.delete'), `${t('common.delete_confirm')} (${u.name})`, () => deleteUser(u.id).then(() => queryClient.invalidateQueries({ queryKey: ['users'] })))}
              className="mt-auto w-full py-4 rounded-2xl bg-white text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all duration-500 border border-white font-black text-[10px] uppercase tracking-widest group-hover:shadow-lg"
            >
              Terminate Access
            </button>
            {/* Decorative element */}
            <div className="absolute top-0 left-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity">
              <Users size={100} className="-rotate-12" />
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
    <div className="glass rounded-[3rem] overflow-hidden border-white/60 shadow-2xl shadow-indigo-500/5 bg-white/40">
      <div className="p-10 border-b border-white/60 flex justify-between items-center bg-white/40">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.4em] leading-none flex items-center gap-4">
            <ClipboardList size={24} className="text-indigo-600" /> {t('common.audit_trail')}
          </h3>
          <div className="h-1 w-24 bg-gradient-to-r from-indigo-500 to-transparent rounded-full" />
        </div>
        <button onClick={() => refetch()} className="glass flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600 hover:bg-white transition-all duration-500 shadow-xl shadow-indigo-500/5">
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> {t('common.refresh')}
        </button>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              <th className="px-10 py-6 whitespace-nowrap">{t('common.time')}</th>
              <th className="px-10 py-6 whitespace-nowrap">{t('common.action')}</th>
              <th className="px-10 py-6 whitespace-nowrap">{t('common.order')} / {t('common.table_name')}</th>
              <th className="px-10 py-6 w-full">{t('common.details')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/40 text-sm font-black uppercase tracking-tight">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={4} className="px-10 py-6"><div className="h-6 bg-white/20 rounded-xl w-full" /></td>
                </tr>
              ))
            ) : auditsResp?.data.map(log => (
              <tr key={`${log.type}-${log.id}`} className="hover:bg-white/60 transition-colors duration-500 group">
                <td className="px-10 py-8 text-slate-400 tabular-nums whitespace-nowrap font-black">{new Date(log.occurred_at).toLocaleString()}</td>
                <td className="px-10 py-8">
                  <div className="text-slate-900 mb-1.5">{log.user_name}</div>
                  <div className="text-[9px] font-black text-indigo-600 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg w-fit group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 tracking-[0.2em]">{log.action.replace(/_/g, ' ')}</div>
                </td>
                <td className="px-10 py-8">
                  <span className={`text-[9px] font-black px-4 py-1.5 rounded-xl border-2 tracking-[0.3em] ${log.type === 'order' ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-blue-100 text-blue-600 border-blue-200'}`}>
                    {log.type === 'order' ? t('common.order') : t('common.system')}
                  </span>
                </td>
                <td className="px-10 py-8 text-slate-500 leading-relaxed font-black">
                  {log.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {auditsResp && (
        <div className="glass mt-0 bg-white/60 border-t border-white/80 p-8 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          <div className="flex items-center gap-4">
            <span className="text-indigo-600">{t('common.page')} {auditsResp?.current_page}</span>
            <span className="opacity-30">/</span>
            <span>{auditsResp?.last_page}</span>
          </div>
          <div className="flex gap-4">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-8 py-3 rounded-xl glass hover:bg-white text-slate-600 disabled:opacity-20 border-white/60 transition-all duration-500 hover:scale-105 active:scale-95">{t('common.prev')}</button>
            <button disabled={page === (auditsResp?.last_page || 1)} onClick={() => setPage(p => p + 1)} className="px-8 py-3 rounded-xl glass hover:bg-white text-slate-600 disabled:opacity-20 border-white/60 transition-all duration-500 hover:scale-105 active:scale-95">{t('common.next')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
