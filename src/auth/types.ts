export type UserRole = 'ADMIN' | 'HO_STAFF' | 'BRANCH_MANAGER' | 'SALES_REP' | 'ACCOUNTS'

export type User = {
  id: string
  full_name: string
  email: string
  role: UserRole
  branch_id: string | null
  phone?: string | null
  is_active: boolean
  last_login_at?: string | null
  created_at?: string
  updated_at?: string
}

export type LoginResponse = { access_token: string; refresh_token: string; user: User }
export type ChangePasswordResponse = { message: string; user: User }
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'
