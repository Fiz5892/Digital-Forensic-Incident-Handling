-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'investigator', 'viewer');

-- Create status enum for cases
CREATE TYPE public.case_status AS ENUM ('open', 'investigation', 'closed');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, role)
);

-- Create function to check user role (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create victims table
CREATE TABLE public.victims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT,
  location TEXT,
  address TEXT,
  report_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create cases table
CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_type TEXT NOT NULL,
  victim_id UUID REFERENCES public.victims(id) ON DELETE CASCADE NOT NULL,
  incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
  summary TEXT,
  status case_status DEFAULT 'open' NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create evidence table
CREATE TABLE public.evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  evidence_type TEXT NOT NULL,
  storage_location TEXT NOT NULL,
  file_hash TEXT,
  file_name TEXT,
  file_size BIGINT,
  collection_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create forensic_actions table
CREATE TABLE public.forensic_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  action_description TEXT NOT NULL,
  execution_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  investigator_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.victims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forensic_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for victims
CREATE POLICY "Authenticated users can view victims" ON public.victims
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and investigators can insert victims" ON public.victims
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'investigator')
  );

CREATE POLICY "Admins and investigators can update victims" ON public.victims
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'investigator')
  );

CREATE POLICY "Admins can delete victims" ON public.victims
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for cases
CREATE POLICY "Authenticated users can view cases" ON public.cases
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and investigators can insert cases" ON public.cases
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'investigator')
  );

CREATE POLICY "Admins and investigators can update cases" ON public.cases
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'investigator')
  );

CREATE POLICY "Admins can delete cases" ON public.cases
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for evidence
CREATE POLICY "Authenticated users can view evidence" ON public.evidence
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and investigators can insert evidence" ON public.evidence
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'investigator')
  );

CREATE POLICY "Admins and investigators can update evidence" ON public.evidence
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'investigator')
  );

CREATE POLICY "Admins can delete evidence" ON public.evidence
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for forensic_actions
CREATE POLICY "Authenticated users can view actions" ON public.forensic_actions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and investigators can insert actions" ON public.forensic_actions
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'investigator')
  );

CREATE POLICY "Admins and investigators can update actions" ON public.forensic_actions
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'investigator')
  );

CREATE POLICY "Admins can delete actions" ON public.forensic_actions
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  
  -- Assign default role as investigator
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'investigator');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_victims_updated_at
  BEFORE UPDATE ON public.victims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evidence_updated_at
  BEFORE UPDATE ON public.evidence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forensic_actions_updated_at
  BEFORE UPDATE ON public.forensic_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_victims_created_by ON public.victims(created_by);
CREATE INDEX idx_cases_victim_id ON public.cases(victim_id);
CREATE INDEX idx_cases_status ON public.cases(status);
CREATE INDEX idx_cases_created_at ON public.cases(created_at);
CREATE INDEX idx_evidence_case_id ON public.evidence(case_id);
CREATE INDEX idx_forensic_actions_case_id ON public.forensic_actions(case_id);