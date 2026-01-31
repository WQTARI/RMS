export type TableStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED'
export type OrderItemStatus = 'PENDING' | 'IN_PROGRESS' | 'READY' | 'SERVED' | 'CANCELLED'
export type OrderStatus = 'OPEN' | 'IN_PROGRESS' | 'READY' | 'CLOSED' | 'CANCELLED'
export type InvoiceStatus = 'OPEN' | 'PAID' | 'CANCELLED'
export type MenuCategory = 'FOOD' | 'DESSERT' | 'DRINK'
export type PaymentMethod = 'CASH' | 'ELECTRONIC'
export type ReservationStatus = 'CREATED' | 'ARRIVED' | 'SEATED' | 'CANCELLED' | 'COMPLETED'

export interface TableSection {
  id: number
  name: string
  description?: string | null
  is_active?: boolean
}

export interface PrepSection {
  id: number
  name: string
  is_active?: boolean
}

export interface RestaurantTable {
  id: number
  name: string
  capacity: number
  section_id: number
  status: TableStatus
  section?: TableSection
  orders?: Order[]
  reservations?: Reservation[]
}

export interface Reservation {
  id: number
  customer_name: string
  phone: string
  date_time: string
  duration_minutes: number
  number_of_guests: number
  table_id: number | null
  status?: ReservationStatus
  notes?: string | null
  table?: RestaurantTable
}

export interface MenuItem {
  id: number
  name: string
  price: number
  description?: string | null
  image_url?: string | null
  category: MenuCategory
  prep_section_id: number
  prep_time_minutes: number
  is_active: boolean
  prep_section?: PrepSection
}

export interface OrderItem {
  id: number
  order_id: number
  menu_item_id: number
  prep_section_id?: number
  quantity: number
  price: number
  status: OrderItemStatus
  notes?: string | null
  menu_item?: MenuItem
}

export interface Order {
  id: number
  table_id: number | null
  reservation_id?: number | null
  customer_name?: string | null
  status: OrderStatus
  created_at: string
  started_at?: string | null
  items: OrderItem[]
  table?: RestaurantTable
  invoice?: Invoice
  reservation?: Reservation
}

export interface InvoicePayment {
  id: number
  method: PaymentMethod
  amount: number
}

export interface Invoice {
  id: number
  table_id: number | null
  customer_name?: string | null
  status: InvoiceStatus
  subtotal: number
  tax: number
  discount: number
  total: number
  closed_at?: string | null
  payments?: InvoicePayment[]
  table?: RestaurantTable
  orders?: Order[]
}

export interface Permission {
  id?: number
  name: string
}

export interface Role {
  id: number
  name: string
  permissions?: Permission[]
}

export interface User {
  id: number
  name: string
  email: string
  phone?: string | null
  is_active: boolean
  prep_section_id?: number | null
  roles?: Role[]
}
