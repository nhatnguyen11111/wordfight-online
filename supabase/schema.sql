-- ==============================================================================
-- SUPABASE DATABASE SCHEMA WITH USER AUTHENTICATION FOR WORDFIGHT ONLINE
-- Chạy toàn bộ script này trong SQL Editor trên Supabase Dashboard
-- ==============================================================================

-- 1. Bảng User Profiles liên kết với auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT,
  nickname TEXT NOT NULL DEFAULT 'Chiến Binh',
  avatar_color TEXT NOT NULL DEFAULT 'from-emerald-400 to-green-600',
  avatar_frame TEXT NOT NULL DEFAULT 'default',
  gems INTEGER NOT NULL DEFAULT 50,
  level INTEGER NOT NULL DEFAULT 1,
  total_wins INTEGER NOT NULL DEFAULT 0,
  total_games INTEGER NOT NULL DEFAULT 0,
  highest_streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Bảng Tiến Độ Màn Chơi (Level Progress)
CREATE TABLE IF NOT EXISTS public.levels_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_mode TEXT NOT NULL, -- 'noi_tu_vi' | 'noi_tu_en' | 'vua_tieng_viet'
  level_id INTEGER NOT NULL,
  stars INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, game_mode, level_id)
);

-- 3. Bảng Từ Điển AI Tự Động Mở Rộng (Continuous AI Vocabulary)
CREATE TABLE IF NOT EXISTS public.ai_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language TEXT NOT NULL DEFAULT 'vi', -- 'vi' | 'en'
  word TEXT NOT NULL,
  first_syllable TEXT,
  last_syllable TEXT,
  meaning TEXT NOT NULL,
  example_sentence TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (language, word)
);

-- 4. Bảng Phòng Đấu Multiplayer (Rooms)
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  host_id TEXT REFERENCES public.profiles(id),
  language TEXT NOT NULL DEFAULT 'vi',
  status TEXT NOT NULL DEFAULT 'WAITING', -- 'WAITING' | 'PLAYING' | 'FINISHED'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_levels_progress_user ON public.levels_progress(user_id, game_mode);
CREATE INDEX IF NOT EXISTS idx_ai_vocabulary_lookup ON public.ai_vocabulary(language, word);
CREATE INDEX IF NOT EXISTS idx_ai_vocabulary_syl ON public.ai_vocabulary(language, first_syllable);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Allow public read and write (anon key access)
CREATE POLICY "Allow public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update profiles" ON public.profiles FOR UPDATE USING (true);

CREATE POLICY "Allow public read levels_progress" ON public.levels_progress FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update levels_progress" ON public.levels_progress FOR ALL USING (true);

CREATE POLICY "Allow public read ai_vocabulary" ON public.ai_vocabulary FOR SELECT USING (true);
CREATE POLICY "Allow public insert ai_vocabulary" ON public.ai_vocabulary FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update rooms" ON public.rooms FOR ALL USING (true);

-- Trigger: Tự động tạo bản ghi Profile khi người dùng đăng ký qua Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname, avatar_color, gems)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nickname', 'Chiến Binh ' || floor(random() * 900 + 100)::text),
    COALESCE(NEW.raw_user_meta_data->>'avatar_color', 'from-emerald-400 to-green-600'),
    50
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nickname = COALESCE(EXCLUDED.nickname, profiles.nickname);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
