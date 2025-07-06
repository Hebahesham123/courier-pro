import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for database tables
export interface Order {
  id: string
  order_id: string
  customer_name: string
  mobile_number: string
  address: string
  status: "pending" | "assigned" | "delivered" | "canceled" | "partial"
  total_order_fees: number
  payment_method: string
  internal_comment?: string
  notes?: string
  assigned_courier_id?: string
  created_at: string
  updated_at: string
}

export interface CourierUser {
  id: string
  name: string
  email: string
  role: "admin" | "courier"
  created_at: string
  updated_at: string
}
