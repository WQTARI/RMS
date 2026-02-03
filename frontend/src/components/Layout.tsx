import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPrepSections } from '../api/sections'
import {
    LayoutDashboard, UtensilsCrossed,
    ChefHat, ClipboardList, Settings, LogOut, TrendingUp, Archive, Languages,
    ChevronLeft, ChevronRight, Menu
} from 'lucide-react'

const NavContent = ({
    navItems,
    user,
    i18n,
    toggleLanguage,
    handleLogout,
    hasPermission,
    location,
    t
}: any) => {
    const { settings, isLoading: isSettingsLoading } = useSettings()

    return (
        <div className="flex flex-col h-full bg-white border-r border-slate-200">
            <div className="h-20 flex items-center px-6 border-b border-slate-100 shrink-0">
                {settings.restaurant_logo ? (
                    <img
                        src={settings.restaurant_logo}
                        alt="Logo"
                        className="w-12 h-12 rounded-xl object-contain mr-4 rtl:mr-0 rtl:ml-4 shadow-sm"
                    />
                ) : (
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white mr-4 rtl:mr-0 rtl:ml-4 shadow-lg shadow-primary/30 transform group-hover:rotate-12 transition-transform shrink-0">
                        <LayoutDashboard size={22} strokeWidth={2.5} />
                    </div>
                )}
                <h1 className="text-xl font-black text-slate-900 tracking-tighter truncate">
                    {isSettingsLoading ? '...' : settings.restaurant_name}
                </h1>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6 text-slate-900">
                {navItems.map((group: any) => {
                    const filtered = group.items.filter((item: any) => {
                        const hasPerm = hasPermission(item.permission)
                        const isAdmin = hasPermission('manage_settings')
                        if (item.hideForAdmin && isAdmin) return false
                        return hasPerm
                    })
                    if (filtered.length === 0) return null

                    return (
                        <div key={group.group}>
                            <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                {group.group}
                            </div>
                            <div className="space-y-1.5 px-1">
                                {filtered.map((item: any) => {
                                    const isActive = location.pathname === item.path
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={`group flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[13px] font-black uppercase tracking-widest transition-all duration-500 ${isActive
                                                ? 'bg-primary text-white shadow-lg shadow-primary/20 translate-x-1 rtl:-translate-x-1'
                                                : 'text-slate-500 hover:bg-white/60 hover:text-primary hover:translate-x-1 rtl:hover:-translate-x-1'
                                                }`}
                                        >
                                            <span className={`transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-6 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary'}`}>
                                                {item.icon}
                                            </span>
                                            {item.label}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-slate-100 space-y-1">
                <div className="px-3 py-2 flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.roles?.[0]?.name || 'Staff'}</p>
                    </div>
                </div>

                <button
                    onClick={toggleLanguage}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 font-medium"
                >
                    <Languages size={18} />
                    {i18n.language.startsWith('ar') ? 'English' : 'العربية'}
                </button>

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50 font-medium transition-colors"
                >
                    <LogOut size={18} />
                    {t('nav.sign_out')}
                </button>
            </div>
        </div>
    )
}

export const Layout = () => {
    const { t, i18n } = useTranslation()
    const { user, logout, hasPermission } = useAuth()
    const { settings, isLoading: isSettingsLoading } = useSettings()
    const navigate = useNavigate()
    const location = useLocation()
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const isRtl = i18n.language.startsWith('ar')

    useEffect(() => {
        setIsMobileMenuOpen(false)
    }, [location.pathname])

    const { data: prepSections = [] } = useQuery({
        queryKey: ['prep-sections'],
        queryFn: fetchPrepSections,
    })

    const navItems = useMemo(() => [
        {
            group: 'OPERATIONS', items: [
                { path: '/waiter', label: t('nav.waiter'), icon: <UtensilsCrossed size={20} />, permission: 'serve_items', hideForAdmin: true },
                {
                    path: '/floor-plan',
                    label: t('nav.floor_plan'),
                    icon: <LayoutDashboard size={18} />,
                    permission: 'manage_reservations'
                },
                { path: '/reservations', label: t('nav.bookings'), icon: <ClipboardList size={20} />, permission: 'manage_reservations' },
                { path: '/pos', label: t('nav.pos'), icon: <UtensilsCrossed size={20} />, permission: 'create_order' },
            ]
        },
        {
            group: 'PRODUCTION', items: [
                ...(hasPermission('manage_settings') ? prepSections.map(s => ({
                    path: `/sections/${s.id}/orders`,
                    label: s.name,
                    icon: <ChefHat size={20} />,
                    permission: 'update_item_status'
                })) : []),
                ...(user?.prep_section_id && !hasPermission('manage_settings') ? prepSections.filter(s => s.id === user.prep_section_id).map(s => ({
                    path: `/sections/${s.id}/orders`,
                    label: s.name,
                    icon: <ChefHat size={20} />,
                    permission: 'update_item_status'
                })) : []),
            ]
        },
        {
            group: 'INSIGHTS', items: [
                { path: '/analysis', label: t('nav.daily_analysis'), icon: <TrendingUp size={20} />, permission: 'view_limited_archive', hideForAdmin: true },
                { path: '/reports', label: t('nav.analytics'), icon: <TrendingUp size={20} />, permission: 'view_reports' },
                { path: '/archive', label: t('nav.archive'), icon: <Archive size={20} />, permission: 'view_reports' },
            ]
        },
        {
            group: 'SYSTEM', items: [
                { path: '/admin', label: t('nav.management'), icon: <Settings size={20} />, permission: 'manage_settings' },
            ]
        }
    ], [prepSections, user, hasPermission, t, i18n.language])

    const toggleLanguage = () => {
        const next = i18n.language.startsWith('ar') ? 'en' : 'ar'
        i18n.changeLanguage(next)
    }

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const commonProps = { navItems, user, i18n, toggleLanguage, handleLogout, hasPermission, location, t }

    return (
        <div className="flex h-screen bg-mesh w-full overflow-hidden font-cairo relative" dir={isRtl ? 'rtl' : 'ltr'}>
            {/* Global Animated Background Blobs */}
            <div className="fixed top-[-25%] left-[-15%] w-[60rem] h-[60rem] bg-indigo-300/20 rounded-full blur-[120px] animate-morph opacity-60 pointer-events-none z-0"></div>
            <div className="fixed bottom-[-25%] right-[-15%] w-[55rem] h-[55rem] bg-purple-300/25 rounded-full blur-[120px] animate-morph opacity-50 pointer-events-none z-0" style={{ animationDelay: '2s', animationDuration: '18s' }}></div>
            <div className="fixed top-1/4 right-1/4 w-[35rem] h-[35rem] bg-[#8E7CF0]/10 rounded-full blur-[100px] animate-pulse pointer-events-none z-0"></div>

            {/* Desktop Sidebar with Glassmorphism */}
            <aside className={`hidden md:block border-r border-slate-200/50 bg-white/70 backdrop-blur-xl transition-all duration-300 ease-in-out overflow-hidden shadow-2xl shadow-indigo-500/5 shrink-0 z-20 ${isSidebarOpen ? 'w-64' : 'w-0 opacity-0'}`}>
                <div className="w-64 h-full">
                    <NavContent {...commonProps} />
                </div>
            </aside>

            {/* Mobile Sidebar (Drawer) */}
            <div className={`fixed inset-0 z-[60] md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsMobileMenuOpen(false)} />
                <div className={`absolute top-0 bottom-0 ${isRtl ? 'right-0' : 'left-0'} w-72 bg-white/90 backdrop-blur-2xl shadow-2xl transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full')
                    }`}>
                    <NavContent {...commonProps} />
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden w-full relative z-10">
                {/* Mobile Header */}
                <header className="h-16 bg-white/70 backdrop-blur-lg border-b border-slate-200/50 flex items-center px-4 justify-between md:hidden shrink-0 z-40">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100/50 rounded-xl transition-colors">
                        <Menu size={24} />
                    </button>
                    <div className="flex items-center gap-2 overflow-hidden px-2">
                        {settings.restaurant_logo ? (
                            <img src={settings.restaurant_logo} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
                        ) : (
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                                <LayoutDashboard size={16} />
                            </div>
                        )}
                        <span className="font-black text-lg text-slate-900 tracking-tight truncate">
                            {isSettingsLoading ? '...' : settings.restaurant_name}
                        </span>
                    </div>
                    <div className="w-10" />
                </header>

                {/* Desktop Toggle (Floating) */}
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className={`hidden md:flex absolute top-6 z-50 p-2.5 bg-white/80 backdrop-blur-md border border-slate-200/50 rounded-xl shadow-xl shadow-indigo-500/10 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-white transition-all duration-300 ${isRtl ? 'right-6' : 'left-6'}`}
                    title={isSidebarOpen ? t('common.hide') : t('common.show')}
                >
                    {isSidebarOpen ? (isRtl ? <ChevronRight size={20} /> : <ChevronLeft size={20} />) : (isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />)}
                </button>

                <div className="flex-1 overflow-y-auto p-4 md:p-10 w-full relative">
                    <div className="max-w-7xl mx-auto w-full">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    )
}
