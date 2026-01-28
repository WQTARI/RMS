import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPrepSections } from '../api/sections'
import {
    LayoutDashboard, UtensilsCrossed,
    ChefHat, ClipboardList, Settings, LogOut, TrendingUp, Archive, Languages,
    ChevronLeft, ChevronRight
} from 'lucide-react'

export const Layout = () => {
    const { t, i18n } = useTranslation()
    const { user, logout, hasPermission } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [isCollapsed, setIsCollapsed] = useState(false)

    const isRtl = i18n.language === 'ar'

    const { data: prepSections = [] } = useQuery({
        queryKey: ['prep-sections'],
        queryFn: fetchPrepSections,
    })

    const navItems = useMemo(() => [
        {
            group: 'OPERATIONS', items: [
                { path: '/reservations', label: t('nav.bookings'), icon: <ClipboardList size={18} />, permission: 'manage_reservations' },
                { path: '/pos', label: t('nav.pos'), icon: <UtensilsCrossed size={18} />, permission: 'create_order' },
            ]
        },
        {
            group: 'PRODUCTION', items: [
                // For Admin: Show all sections
                ...(hasPermission('manage_settings') ? prepSections.map(s => ({
                    path: `/sections/${s.id}/orders`,
                    label: s.name,
                    icon: <ChefHat size={18} />,
                    permission: 'update_item_status'
                })) : []),
                // For Cashier/Aggregated view:
                ...(hasPermission('create_order') && !user?.prep_section_id ? [{
                    path: '/sections/all/orders',
                    label: t('common.all_sections'),
                    icon: <ClipboardList size={18} />,
                    permission: 'update_item_status'
                }] : []),
                // For Section Staff: Show only their section
                ...(user?.prep_section_id && !hasPermission('manage_settings') ? prepSections.filter(s => s.id === user.prep_section_id).map(s => ({
                    path: `/sections/${s.id}/orders`,
                    label: s.name,
                    icon: <ChefHat size={18} />,
                    permission: 'update_item_status'
                })) : []),
            ]
        },
        {
            group: 'INSIGHTS', items: [
                { path: '/reports', label: t('nav.analytics'), icon: <TrendingUp size={18} />, permission: 'view_reports' },
                { path: '/archive', label: t('nav.archive'), icon: <Archive size={18} />, permission: 'view_reports' },
            ]
        },
        {
            group: 'SYSTEM', items: [
                { path: '/admin', label: t('nav.management'), icon: <Settings size={18} />, permission: 'manage_settings' },
            ]
        }
    ], [prepSections, user, hasPermission, t])

    const toggleLanguage = () => {
        const next = i18n.language === 'ar' ? 'en' : 'ar'
        i18n.changeLanguage(next)
    }

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const sidebarWidth = isCollapsed ? 'w-20' : 'w-64'
    const sidebarPos = isRtl ? 'right-0' : 'left-0'
    const borderSide = isRtl ? 'border-l' : 'border-r'
    const contentMargin = isCollapsed
        ? (isRtl ? 'mr-20' : 'ml-20')
        : (isRtl ? 'mr-64' : 'ml-64')

    return (
        <div className="flex min-h-screen bg-slate-50 overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
            {/* Sidebar Navigation */}
            <aside className={`${sidebarWidth} glass ${borderSide} border-slate-200 flex flex-col fixed inset-y-0 ${sidebarPos} z-50 transition-all duration-300 ease-in-out`}>
                <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                        <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white shadow-md shadow-primary/20">
                            <LayoutDashboard size={18} />
                        </div>
                        <h1 className="text-lg font-black text-slate-900 leading-none">RMS</h1>
                    </div>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all ${isCollapsed ? 'mx-auto' : ''}`}
                    >
                        {isCollapsed ? (isRtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />) : (isRtl ? <ChevronRight size={18} /> : <ChevronLeft size={18} />)}
                    </button>
                </div>

                <nav className="flex-1 p-3 space-y-6 overflow-y-auto no-scrollbar py-4">
                    {navItems.map((group) => {
                        const filtered = group.items.filter(item => hasPermission(item.permission))
                        if (filtered.length === 0) return null

                        return (
                            <div key={group.group} className="space-y-1">
                                {!isCollapsed && (
                                    <div className="px-3 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                        {group.group}
                                    </div>
                                )}
                                {filtered.map((item) => {
                                    const isActive = location.pathname === item.path
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all group ${isActive
                                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                                            title={isCollapsed ? item.label : ''}
                                        >
                                            <span className={`${isActive ? 'text-white' : 'group-hover:text-primary'} transition-colors shrink-0`}>{item.icon}</span>
                                            {!isCollapsed && (
                                                <span className="transition-all duration-300 truncate opacity-100">
                                                    {item.label}
                                                </span>
                                            )}
                                        </Link>
                                    )
                                })}
                            </div>
                        )
                    })}
                </nav>

                <div className="p-3 border-t border-slate-100 space-y-2 shrink-0">
                    <div className={`bg-slate-100/50 rounded-2xl p-2.5 flex items-center gap-2 mb-1 transition-all ${isCollapsed ? 'justify-center' : ''}`}>
                        <div className="w-9 h-9 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs">
                            {user?.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={`min-w-0 transition-all duration-300 ${isCollapsed ? 'hidden opacity-0 w-0' : 'opacity-100'}`}>
                            <p className="text-xs font-black text-slate-900 truncate leading-tight">{user?.name}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">{user?.roles?.[0]?.name || 'Staff'}</p>
                        </div>
                    </div>

                    <button
                        onClick={toggleLanguage}
                        className={`w-full flex items-center gap-2 px-3 py-3 rounded-xl bg-slate-100/50 text-slate-500 text-xs font-black uppercase tracking-wider hover:bg-slate-100 transition-all ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}
                    >
                        <div className="flex items-center gap-2">
                            <Languages size={16} />
                            <span className={isCollapsed ? 'hidden' : ''}>
                                {i18n.language === 'ar' ? 'English' : 'العربية'}
                            </span>
                        </div>
                    </button>

                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-black uppercase tracking-wider hover:bg-rose-100 transition-all ${isCollapsed ? 'px-0' : ''}`}
                        title={isCollapsed ? t('nav.sign_out') : ''}
                    >
                        <LogOut size={16} />
                        {!isCollapsed && <span>{t('nav.sign_out')}</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className={`flex-1 transition-all duration-300 ${contentMargin} bg-mesh min-h-screen relative`}>
                <div className="max-w-[1600px] mx-auto p-6 md:p-10">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}
