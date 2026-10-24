import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleSupabaseError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: SupabaseErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
    },
    operationType,
    path,
  };
  console.error('Supabase Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      // If permissions deny access, the connection reached the server successfully
      if (error.code === '42501' || error.message.includes('permission')) {
        return { success: true };
      }
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
