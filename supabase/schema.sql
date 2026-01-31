-- Iverson Budget Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    annual_income_target NUMERIC(12,2) DEFAULT 0,
    savings_rate_target NUMERIC(5,2) DEFAULT 10.00,
    retirement_date DATE,
    retirement_savings_goal NUMERIC(14,2) DEFAULT 0,
    travel_fund_goal NUMERIC(12,2) DEFAULT 0,
    emergency_fund_goal NUMERIC(12,2) DEFAULT 0,
    waffles_fund_goal NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INCOME ENTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS income_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    source TEXT NOT NULL DEFAULT 'Salary',
    description TEXT,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EXPENSE ENTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expense_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    description TEXT,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SAVINGS ENTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS savings_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    fund_type TEXT NOT NULL DEFAULT 'general',
    description TEXT,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BUDGET SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS budget_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, setting_key)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_settings ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Income entries: users can only access their own entries
CREATE POLICY "Users can view own income" ON income_entries
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own income" ON income_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own income" ON income_entries
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own income" ON income_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Expense entries: users can only access their own entries
CREATE POLICY "Users can view own expenses" ON expense_entries
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON expense_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON expense_entries
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON expense_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Savings entries: users can only access their own entries
CREATE POLICY "Users can view own savings" ON savings_entries
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own savings" ON savings_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own savings" ON savings_entries
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own savings" ON savings_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Budget settings: users can only access their own settings
CREATE POLICY "Users can view own settings" ON budget_settings
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON budget_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON budget_settings
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own settings" ON budget_settings
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_income_user_date ON income_entries(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_user_date ON expense_entries(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_user_category ON expense_entries(user_id, category);
CREATE INDEX IF NOT EXISTS idx_savings_user_date ON savings_entries(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_savings_user_fund ON savings_entries(user_id, fund_type);
CREATE INDEX IF NOT EXISTS idx_budget_settings_user ON budget_settings(user_id, setting_key);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_income_updated_at BEFORE UPDATE ON income_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_expense_updated_at BEFORE UPDATE ON expense_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_savings_updated_at BEFORE UPDATE ON savings_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON budget_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
