
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://swcajhaxbtvnpjvuaefa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Y2FqaGF4YnR2bnBqdnVhZWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2ODk2NTcsImV4cCI6MjA4MTI2NTY1N30.5iKdX7C90PkVrEV8FvaEivCW5sq-AocE6DXQu2fCwno';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
