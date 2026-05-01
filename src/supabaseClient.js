import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ustqscfralnldrprgueb.supabase.co'
const supabaseKey = 'sb_publishable_WK4_2kMxvcfJSmWEsJKDpw_QDNo9jol'

export const supabase = createClient(supabaseUrl, supabaseKey)