import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ShoppingCart, Plus, Minus, Trash2, Check, Lock, X, LogOut, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '../utils/format'

interface MenuItem {
    id: number
    name: string
    price: number
    description?: string
    category: string
    image_url?: string
    prep_section_id: number
}

interface CartItem extends MenuItem {
    quantity: number
    notes?: string
}

export const CustomerMenuPage = () => {
    const { t } = useTranslation() // Removed unused i18n
    const [searchParams] = useSearchParams()
    const tableId = searchParams.get('table')

    const [activeCategory, setActiveCategory] = useState<string>('all')
    const [cart, setCart] = useState<CartItem[]>([])
    const [showCart, setShowCart] = useState(false)

    // Captain Mode State
    const [showPinModal, setShowPinModal] = useState(false)
    const [isCaptain, setIsCaptain] = useState(false)
    const [captainName, setCaptainName] = useState('')

    // Fetch menu items
    const { data: menuItems = [] } = useQuery({
        queryKey: ['menu-items'],
        queryFn: async () => {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/menu-items`)
            if (!res.ok) throw new Error('Failed to load menu')
            return res.json()
        },
    })

    // Load draft order & set status
    useEffect(() => {
        if (!tableId) return

        const loadDraft = () => {
            fetch(`${import.meta.env.VITE_API_URL}/public/tables/${tableId}/draft-order`)
                .then(res => res.json())
                .then(draftItems => {
                    if (draftItems.length > 0) {
                        const cartItems = draftItems.map((item: any) => ({
                            ...item.menuItem,
                            quantity: item.quantity,
                            notes: item.notes,
                        }))
                        setCart(cartItems)
                    }
                })
                .catch(() => { })
        }

        // Set status to BROWSING
        const setBrowsingStatus = () => {
            fetch(`${import.meta.env.VITE_API_URL}/public/tables/${tableId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'BROWSING' })
            }).catch(() => { })
        }

        loadDraft()
        setBrowsingStatus()

        // Poll for updates if it's a customer view to see live changes if captain edits? 
        // For now just load once or we can add polling if needed.
    }, [tableId])

    // Submit draft order (Customer)
    const submitDraftMutation = useMutation({
        mutationFn: async () => {
            if (!tableId) throw new Error('No table ID')

            const items = cart.map(item => ({
                menu_item_id: item.id,
                quantity: item.quantity,
                notes: item.notes || '',
            }))

            const res = await fetch(`${import.meta.env.VITE_API_URL}/public/tables/${tableId}/draft-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items }),
            })

            if (!res.ok) throw new Error('Failed to submit order')
            return res.json()
        },
        onSuccess: () => {
            toast.success('تم حفظ طلبك! سيأتي الكابتن لتأكيده.')
            // Don't clear cart explicitly if we want them to see what they verify, 
            // but usually confirmation clears it or moves to "Ordered".
            // For this flow, we might want to keep it until confirmed. 
            // But if it's draft, it's saved in DB.
        },
        onError: () => {
            toast.error('فشل حفظ الطلب')
        },
    })

    // Confirm Order (Captain)
    const confirmOrderMutation = useMutation({
        mutationFn: async () => {
            if (!tableId) throw new Error('No table ID')

            // First save recent changes as draft to ensure backend has latest state
            // OR confirm endpoint takes items? 
            // Usually confirm takes the current draft.
            // Let's ensure current cart matches draft by saving it first or sending items.
            // The logic: 
            // 1. Captain edits cart (local state).
            // 2. Captain clicks Confirm.
            // 3. We send { items, captain_id } to confirm endpoint. 
            //    This endpoint should overwrite draft and convert to real order.

            const items = cart.map(item => ({
                menu_item_id: item.id,
                quantity: item.quantity,
                notes: item.notes || '',
            }))

            const res = await fetch(`${import.meta.env.VITE_API_URL}/public/tables/${tableId}/confirm-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items,
                    // We need to pass captain info or rely on stored session? 
                    // Since it's a public endpoint protected by PIN flow essentially (but here just logic),
                    // ideally we pass the captain ID if we stored it, or the endpoint trusts the "confirm" action.
                    // Wait, confirm-order endpoint in CaptainOrderController likely needs authentication or PIN again?
                    // Or simply it converts the draft.
                    // Let's assume passed items overwrite draft & confirm.
                    captain_name: captainName // Optional: logged in captain name
                }),
            })

            if (!res.ok) throw new Error('Failed to confirm order')
            return res.json()
        },
        onSuccess: () => {
            toast.success('تم تأكيد الطلب بنجاح!')
            setCart([])
            setIsCaptain(false)
        },
        onError: () => {
            toast.error('فشل تأكيد الطلب')
        }
    })


    // Cart functions
    const addToCart = (item: MenuItem) => {
        const existing = cart.find(i => i.id === item.id)
        if (existing) {
            setCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))
        } else {
            setCart([...cart, { ...item, quantity: 1 }])
        }
        toast.success(`تمت الإضافة: ${item.name}`, { position: 'bottom-center' })
    }

    const updateQuantity = (itemId: number, delta: number) => {
        setCart(cart.map(item => {
            if (item.id === itemId) {
                const newQty = item.quantity + delta
                return newQty > 0 ? { ...item, quantity: newQty } : item
            }
            return item
        }).filter(item => item.quantity > 0))
    }

    const removeFromCart = (itemId: number) => {
        setCart(cart.filter(item => item.id !== itemId))
    }

    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    // Group items by category
    const itemsByCategory = menuItems.reduce((acc: any, item: MenuItem) => {
        if (!acc[item.category]) acc[item.category] = []
        acc[item.category].push(item)
        return acc
    }, {})

    // Scroll to category
    const scrollToCategory = (cat: string) => {
        const el = document.getElementById(`cat-${cat}`)
        if (el) {
            const offset = 80 // Header height
            const bodyRect = document.body.getBoundingClientRect().top
            const elementRect = el.getBoundingClientRect().top
            const elementPosition = elementRect - bodyRect
            const offsetPosition = elementPosition - offset

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            })
            setActiveCategory(cat)
        }
    }

    if (!tableId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100 bg-mesh p-4">
                <div className="glass-card p-12 shadow-2xl text-center max-w-md w-full animate-in zoom-in-95 duration-700">
                    <div className="size-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl border border-rose-100">
                        <Check size={48} className="text-rose-500" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-950 mb-4 tracking-tighter">امسح الكود</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-tight text-sm">يرجى مسح رمز QR الموجود على الطاولة للبدء.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-100 bg-mesh" dir="rtl">
            {/* Top Navigation */}
            <div className={`fixed top-0 left-0 right-0 backdrop-blur-2xl border-b z-50 h-[76px] transition-all duration-500
                ${isCaptain ? 'bg-slate-900/95 border-white/10 shadow-2xl' : 'bg-slate-100/80 border-slate-200/50 shadow-sm'}
            `}>
                <div className="h-full max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`size-12 rounded-2xl flex items-center justify-center shadow-lg ${isCaptain ? 'bg-indigo-600' : 'bg-white'}`}>
                            <ShoppingCart className={`size-6 ${isCaptain ? 'text-white' : 'text-slate-900'}`} />
                        </div>
                        <div>
                            <h1 className={`text-xl font-black tracking-tighter leading-none mb-1 ${isCaptain ? 'text-white' : 'text-slate-900'}`}>
                                {isCaptain ? captainName : t('nav.menu')}
                            </h1>
                            <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isCaptain ? 'text-indigo-300' : 'text-slate-400'}`}>
                                <span className={`size-1.5 rounded-full ${isCaptain ? 'bg-indigo-400' : 'bg-slate-300'}`} />
                                {t('common.table')} {tableId}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isCaptain ? (
                            <button
                                onClick={() => { setIsCaptain(false); setCaptainName('') }}
                                className="size-11 rounded-xl bg-indigo-800/50 text-indigo-100 hover:bg-indigo-700 hover:text-white transition-all flex items-center justify-center border border-indigo-700/50"
                            >
                                <LogOut size={20} />
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowPinModal(true)}
                                className="size-11 rounded-xl bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 flex items-center justify-center transition-all shadow-sm"
                            >
                                <Lock size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="pt-[70px] max-w-7xl mx-auto flex">
                {/* Sidebar Categories (Desktop) / Sticky Top (Mobile) */}
                <div className="hidden lg:block w-64 fixed top-[70px] right-[max(0px,calc(50%-40rem))] bottom-0 bg-white border-l border-slate-200 overflow-y-auto z-40">
                    <div className="p-6 space-y-2">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">الأقسام</h3>
                        {Object.keys(itemsByCategory).map(cat => (
                            <button
                                key={cat}
                                onClick={() => scrollToCategory(cat)}
                                className={`w-full text-right px-4 py-3 rounded-xl font-bold transition-all ${activeCategory === cat
                                    ? 'bg-rose-50 text-rose-600 border-r-4 border-rose-500'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mobile Categories (Horizontal Scroll) */}
                <div className="lg:hidden fixed top-[70px] left-0 right-0 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/50 z-40 overflow-x-auto no-scrollbar">
                    <div className="flex p-4 gap-4 min-w-max">
                        {Object.keys(itemsByCategory).map(cat => (
                            <button
                                key={cat}
                                onClick={() => scrollToCategory(cat)}
                                className={`px-6 py-2.5 rounded-2xl font-black text-[11px] uppercase tracking-widest whitespace-nowrap transition-all duration-300 ${activeCategory === cat
                                    ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 scale-105'
                                    : 'bg-white/50 text-slate-500 border border-slate-200/50'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 lg:mr-64 p-4 lg:p-8 pt-[80px] lg:pt-8 pb-32">
                    {Object.entries(itemsByCategory).map(([category, items]: [string, any]) => (
                        <div key={category} id={`cat-${category}`} className="mb-12 scroll-mt-24">
                            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                                <span className="w-8 h-1 bg-rose-500 rounded-full"></span>
                                {category}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {items.map((item: MenuItem) => (
                                    <div key={item.id} className="group glass-card p-5 animate-in fade-in zoom-in-95 duration-500">
                                        <div className="flex gap-6">
                                            {item.image_url && (
                                                <div className="relative size-28 shrink-0 overflow-hidden rounded-[2rem] shadow-xl border-4 border-white/50">
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.name}
                                                        className="size-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                                    />
                                                </div>
                                            )}
                                            <div className="flex-1 flex flex-col justify-between py-1">
                                                <div className="space-y-1">
                                                    <h3 className="text-xl font-black text-slate-950 leading-tight tracking-tighter">{item.name}</h3>
                                                    <p className="text-[11px] font-bold text-slate-500 line-clamp-2 leading-relaxed">{item.description}</p>
                                                </div>
                                                <div className="flex items-center justify-between mt-4">
                                                    <span className="font-black text-2xl text-indigo-600 tabular-nums">{formatCurrency(item.price)}</span>
                                                    <button
                                                        onClick={() => addToCart(item)}
                                                        className="btn-indigo size-12"
                                                    >
                                                        <Plus size={24} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Cart Sidebar (Desktop Sticky) */}
                <div className="hidden lg:block w-96 fixed top-[70px] left-[max(0px,calc(50%-40rem))] bottom-0 bg-white border-r border-slate-200 z-40">
                    <CartContent
                        cart={cart}
                        totalPrice={totalPrice}
                        onUpdateQuantity={updateQuantity}
                        onRemove={removeFromCart}
                        onSubmit={() => isCaptain ? confirmOrderMutation.mutate() : submitDraftMutation.mutate()}
                        isSubmitting={isCaptain ? confirmOrderMutation.isPending : submitDraftMutation.isPending}
                        isCaptain={isCaptain}
                    />
                </div>
            </div>

            {/* Mobile Persistent Cart Bar */}
            {cart.length > 0 && (
                <div className="lg:hidden fixed bottom-6 left-6 right-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
                    <div className="glass-dark text-white rounded-[2.5rem] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-between pl-8 pr-2 border-white/20">
                        <div onClick={() => setShowCart(true)} className="flex flex-col cursor-pointer py-1">
                            <span className="text-[10px] text-indigo-300 font-black uppercase tracking-[0.2em] leading-none mb-1.5">{cart.reduce((a, b) => a + b.quantity, 0)} {t('common.items')}</span>
                            <span className="text-2xl font-black tabular-nums tracking-tighter">{formatCurrency(totalPrice)}</span>
                        </div>
                        <button
                            onClick={() => setShowCart(true)}
                            className="bg-white text-slate-900 px-8 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shadow-xl"
                        >
                            <span>{t('pos.view_cart')}</span>
                            <ChevronRight size={18} className="rtl:rotate-180" />
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile Cart Drawer */}
            {showCart && (
                <div className="lg:hidden fixed inset-0 z-[60]">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCart(false)} />
                    <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2.5rem] shadow-2xl h-[85vh] flex flex-col animate-in slide-in-from-bottom-100 duration-300">
                        <div className="p-6 pb-0 flex-shrink-0">
                            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-black text-slate-900">Your Order</h2>
                                <button onClick={() => setShowCart(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6">
                            <CartContent
                                cart={cart}
                                totalPrice={totalPrice}
                                onUpdateQuantity={updateQuantity}
                                onRemove={removeFromCart}
                                onSubmit={() => isCaptain ? confirmOrderMutation.mutate() : submitDraftMutation.mutate()}
                                isSubmitting={isCaptain ? confirmOrderMutation.isPending : submitDraftMutation.isPending}
                                isCaptain={isCaptain}
                            />
                        </div>
                    </div>
                </div>
            )}

            <PinLoginModal
                isOpen={showPinModal}
                onClose={() => setShowPinModal(false)}
                onSuccess={(user: any) => {
                    setIsCaptain(true)
                    setCaptainName(user.name)
                    setShowPinModal(false)
                    toast.success(`أهلاً كابتن ${user.name}`)
                }}
            />
        </div>
    )
}

// Extracted Cart Component
const CartContent = ({ cart, totalPrice, onUpdateQuantity, onRemove, onSubmit, isSubmitting, isCaptain }: any) => {
    const { t } = useTranslation()
    if (cart.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-slate-100/30">
                <div className={`size-32 rounded-[3.5rem] flex items-center justify-center shadow-2xl mb-8 animate-float ${isCaptain ? 'bg-indigo-600 text-white' : 'bg-white text-slate-300'}`}>
                    <ShoppingCart size={48} />
                </div>
                <h3 className="text-xl font-black text-slate-950 mb-3 tracking-tighter">طلباتك خالية</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-white/50 px-6 py-2 rounded-full border border-slate-200/50">
                    أضف بعض الأطباق المميزة للبدء
                </p>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            <div className={`p-8 border-b backdrop-blur-xl sticky top-0 z-20 ${isCaptain ? 'bg-indigo-900/10 border-indigo-100' : 'bg-white/80 border-slate-100'}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-950 tracking-tighter flex items-center gap-3">
                            <Check className={isCaptain ? 'text-indigo-600' : 'text-emerald-500'} />
                            {isCaptain ? 'تأكيد الطلب' : 'سلة الطلبات'}
                        </h2>
                        {isCaptain && <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">كابتن: مراجعة الطلب</p>}
                    </div>
                    <span className="text-[10px] font-black bg-slate-950 text-white px-3 py-1 rounded-full uppercase tracking-widest">
                        {cart.length} {t('common.items')}
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.map((item: any) => (
                    <div key={item.id} className="group glass rounded-3xl p-4 shadow-sm hover:shadow-md transition-all border-slate-100/50">
                        <div className="flex justify-between items-start mb-4">
                            <div className="space-y-1">
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.name}</h4>
                                <div className="text-[10px] font-bold text-slate-400 tabular-nums">{formatCurrency(item.price)}</div>
                            </div>
                            <button
                                onClick={() => onRemove(item.id)}
                                className="size-8 flex items-center justify-center rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-1.5 border border-slate-200/50 shadow-inner" dir="ltr">
                                <button
                                    onClick={() => onUpdateQuantity(item.id, -1)}
                                    className="size-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm active:scale-90"
                                >
                                    <Minus size={14} />
                                </button>
                                <span className="font-black text-sm w-6 text-center text-slate-900">{item.quantity}</span>
                                <button
                                    onClick={() => onUpdateQuantity(item.id, 1)}
                                    className={`size-10 flex items-center justify-center rounded-xl text-white transition-all shadow-lg active:scale-90 ${isCaptain ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-slate-900 shadow-slate-900/10'}`}
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t('common.total')}</div>
                                <div className="font-black text-rose-600 tabular-nums">{formatCurrency(item.price * item.quantity)}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <span className="text-slate-500 font-black uppercase tracking-widest text-xs">{t('pos.subtotal', 'المجموع')}</span>
                    <span className="text-2xl font-black text-slate-900 tabular-nums">{formatCurrency(totalPrice)}</span>
                </div>
                <button
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    className={`w-full py-4 text-white rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3
                        ${isCaptain ? 'bg-indigo-600 shadow-indigo-500/30 hover:bg-indigo-500' : 'bg-slate-900 shadow-slate-900/20 hover:bg-rose-600 hover:shadow-rose-600/30'}
                    `}
                >
                    {isSubmitting ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <span>{isCaptain ? 'تأكيد الطلب وطباعة' : 'إرسال للكابتن'}</span>
                            <Check size={20} />
                        </>
                    )}
                </button>
            </div>
        </div >
    )
}

const PinLoginModal = ({ isOpen, onClose, onSuccess }: any) => {
    const [pin, setPin] = useState('')
    const [selectedUser, setSelectedUser] = useState<any>(null)

    const { data: captains = [] } = useQuery({
        queryKey: ['captains'],
        queryFn: async () => {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/public/captains`)
            if (!res.ok) return []
            return res.json()
        },
        enabled: isOpen
    })

    const verifyMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/public/verify-pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: selectedUser.id, pin })
            })
            if (!res.ok) throw new Error('رمز غير صحيح')
            return res.json()
        },
        onSuccess: (data) => {
            if (data.valid) {
                onSuccess(data.user)
                setPin('')
                setSelectedUser(null)
            }
        },
        onError: () => {
            toast.error('رمز الدخول خاطئ', { icon: '🔒' })
            setPin('')
        }
    })

    // Auto verify when pin length is 4-6
    useEffect(() => {
        if (selectedUser && pin.length >= 4) {
            verifyMutation.mutate()
        }
    }, [pin])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
                        <Lock size={32} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">دخول الكابتن</h3>
                    <p className="text-sm text-slate-500 mb-8 font-bold">يرجى اختيار اسمك وإدخال الرمز</p>

                    {!selectedUser ? (
                        <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto">
                            {captains.map((cap: any) => (
                                <button
                                    key={cap.id}
                                    onClick={() => setSelectedUser(cap)}
                                    className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-700 font-bold text-slate-700 transition-all"
                                >
                                    {cap.name}
                                </button>
                            ))}
                            {captains.length === 0 && <p className="col-span-2 text-sm text-slate-400">لا يوجد كابتن مسجل</p>}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <button onClick={() => { setSelectedUser(null); setPin('') }} className="text-xs font-bold text-indigo-500 hover:underline">
                                تغيير المستخدم ({selectedUser.name})
                            </button>

                            <div className="flex justify-center gap-4">
                                {[0, 1, 2, 3].map(i => (
                                    <div key={i} className={`w-4 h-4 rounded-full transition-all ${i < pin.length ? 'bg-indigo-600 scale-110' : 'bg-slate-200'}`} />
                                ))}
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => setPin(p => (p.length < 6 ? p + num : p))}
                                        className="h-14 rounded-xl bg-slate-50 font-black text-xl text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <button onClick={() => setPin(p => p.slice(0, -1))} className="h-14 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors"><X size={20} /></button>
                                <button onClick={() => setPin(p => (p.length < 6 ? p + '0' : p))} className="h-14 rounded-xl bg-slate-50 font-black text-xl text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">0</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
