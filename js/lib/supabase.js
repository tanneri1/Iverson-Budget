// Supabase Client Configuration
// Iverson Budget project

const SUPABASE_URL = 'https://lmzgfmkrqolgwbcixuuq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_026GqkGFWq6OMTOtYegmVQ_ieFdsxI3';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth helper functions
export const auth = {
    async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        return data;
    },

    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    async getSession() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    },

    async getUser() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    },

    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(callback);
    }
};

// Profile helper functions
export const profiles = {
    async get(userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    async update(userId, updates) {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();
        if (error) throw error;
        return data;
    }
};

// Income entries helper functions
export const incomeEntries = {
    async list(userId, startDate, endDate) {
        let query = supabase
            .from('income_entries')
            .select('*')
            .eq('user_id', userId)
            .order('entry_date', { ascending: false });

        if (startDate) query = query.gte('entry_date', startDate);
        if (endDate) query = query.lte('entry_date', endDate);

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async create(entry) {
        const { data, error } = await supabase
            .from('income_entries')
            .insert(entry)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async update(id, updates) {
        const { data, error } = await supabase
            .from('income_entries')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async delete(id) {
        const { error } = await supabase
            .from('income_entries')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};

// Expense entries helper functions
export const expenseEntries = {
    async list(userId, startDate, endDate) {
        let query = supabase
            .from('expense_entries')
            .select('*')
            .eq('user_id', userId)
            .order('entry_date', { ascending: false });

        if (startDate) query = query.gte('entry_date', startDate);
        if (endDate) query = query.lte('entry_date', endDate);

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async create(entry) {
        const { data, error } = await supabase
            .from('expense_entries')
            .insert(entry)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async update(id, updates) {
        const { data, error } = await supabase
            .from('expense_entries')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async delete(id) {
        const { error } = await supabase
            .from('expense_entries')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};

// Savings entries helper functions
export const savingsEntries = {
    async list(userId, startDate, endDate) {
        let query = supabase
            .from('savings_entries')
            .select('*')
            .eq('user_id', userId)
            .order('entry_date', { ascending: false });

        if (startDate) query = query.gte('entry_date', startDate);
        if (endDate) query = query.lte('entry_date', endDate);

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async listByFund(userId, fundType) {
        const { data, error } = await supabase
            .from('savings_entries')
            .select('*')
            .eq('user_id', userId)
            .eq('fund_type', fundType)
            .order('entry_date', { ascending: false });
        if (error) throw error;
        return data;
    },

    async create(entry) {
        const { data, error } = await supabase
            .from('savings_entries')
            .insert(entry)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async update(id, updates) {
        const { data, error } = await supabase
            .from('savings_entries')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async delete(id) {
        const { error } = await supabase
            .from('savings_entries')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};

// Budget settings helper functions
export const budgetSettings = {
    async get(userId, key) {
        const { data, error } = await supabase
            .from('budget_settings')
            .select('setting_value')
            .eq('user_id', userId)
            .eq('setting_key', key)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data?.setting_value;
    },

    async set(userId, key, value) {
        const { data, error } = await supabase
            .from('budget_settings')
            .upsert({ user_id: userId, setting_key: key, setting_value: value })
            .select()
            .single();
        if (error) throw error;
        return data;
    }
};
