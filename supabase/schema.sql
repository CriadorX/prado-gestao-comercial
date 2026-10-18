-- ==============================================================================
-- PRADO COMÉRCIO & SOLUÇÕES — ESQUEMA COMPLETO SUPABASE POSTGRESQL + RLS
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE PERFIS DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    papel TEXT NOT NULL DEFAULT 'operador' CHECK (papel IN ('admin_global', 'operador')),
    cargo TEXT DEFAULT 'Comercial',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Habilitar RLS em perfis
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para verificar se o usuário autenticado é admin global
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.perfis
        WHERE id = auth.uid() AND (papel = 'admin_global' OR email = 'licitadigitaltech@gmail.com')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas de acesso para perfis
CREATE POLICY "Leitura de perfis" ON public.perfis
    FOR SELECT USING (
        public.is_admin() OR id = auth.uid()
    );

CREATE POLICY "Atualização de próprio perfil ou por admin" ON public.perfis
    FOR UPDATE USING (
        public.is_admin() OR id = auth.uid()
    );

-- Trigger para criar perfil automaticamente no cadastro pelo Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    papel_inicial TEXT;
BEGIN
    IF NEW.email = 'licitadigitaltech@gmail.com' THEN
        papel_inicial := 'admin_global';
    ELSE
        papel_inicial := 'operador';
    END IF;

    INSERT INTO public.perfis (id, nome, email, papel, cargo)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
        NEW.email,
        papel_inicial,
        CASE WHEN papel_inicial = 'admin_global' THEN 'Administrador' ELSE 'Representante Comercial' END
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3. TABELA DE CLIENTES
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    doc TEXT, -- CNPJ ou CPF
    contato TEXT,
    email TEXT,
    telefone TEXT,
    endereco TEXT,
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo', 'Em prospecção')),
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes: Leitura" ON public.clientes
    FOR SELECT USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "Clientes: Inserção" ON public.clientes
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR public.is_admin()));

CREATE POLICY "Clientes: Atualização" ON public.clientes
    FOR UPDATE USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "Clientes: Exclusão" ON public.clientes
    FOR DELETE USING (public.is_admin() OR user_id = auth.uid());


-- 4. TABELA DE FORNECEDORES
CREATE TABLE IF NOT EXISTS public.fornecedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    doc TEXT, -- CNPJ
    contato TEXT,
    email TEXT,
    telefone TEXT,
    categoria TEXT,
    status TEXT NOT NULL DEFAULT 'Em validação' CHECK (status IN ('Ativo', 'Em validação', 'Bloqueado', 'Em cotação')),
    dados_bancarios JSONB,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fornecedores: Leitura" ON public.fornecedores
    FOR SELECT USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "Fornecedores: Inserção" ON public.fornecedores
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR public.is_admin()));

CREATE POLICY "Fornecedores: Atualização" ON public.fornecedores
    FOR UPDATE USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "Fornecedores: Exclusão" ON public.fornecedores
    FOR DELETE USING (public.is_admin() OR user_id = auth.uid());


-- 5. TABELA DE OPORTUNIDADES / INTERMEDIAÇÕES
CREATE TABLE IF NOT EXISTS public.oportunidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    cliente_nome TEXT,
    valor NUMERIC(12, 2) DEFAULT 0,
    custo_estimado NUMERIC(12, 2) DEFAULT 0,
    margem_estimada NUMERIC(12, 2) DEFAULT 0,
    prazo DATE,
    descricao TEXT,
    status TEXT NOT NULL DEFAULT 'Entrada' CHECK (status IN ('Entrada', 'Cotação', 'Proposta', 'Aprovado', 'Entregue', 'Cancelado')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.oportunidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Oportunidades: Leitura" ON public.oportunidades
    FOR SELECT USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "Oportunidades: Inserção" ON public.oportunidades
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR public.is_admin()));

CREATE POLICY "Oportunidades: Atualização" ON public.oportunidades
    FOR UPDATE USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "Oportunidades: Exclusão" ON public.oportunidades
    FOR DELETE USING (public.is_admin() OR user_id = auth.uid());


-- 6. TABELA DE COTAÇÕES DE FORNECEDORES (VINCULADAS À OPORTUNIDADE)
CREATE TABLE IF NOT EXISTS public.cotacoes_fornecedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    oportunidade_id UUID NOT NULL REFERENCES public.oportunidades(id) ON DELETE CASCADE,
    fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
    fornecedor_nome TEXT NOT NULL,
    valor_unitario NUMERIC(12, 2) DEFAULT 0,
    valor_total NUMERIC(12, 2) DEFAULT 0,
    frete NUMERIC(12, 2) DEFAULT 0,
    prazo_entrega_dias INT DEFAULT 0,
    condicoes_pagamento TEXT,
    arquivo_url TEXT,
    status TEXT DEFAULT 'Recebido' CHECK (status IN ('Recebido', 'Selecionado', 'Recusado')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.cotacoes_fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cotacoes: Acesso por oportunidade" ON public.cotacoes_fornecedores
    FOR ALL USING (
        public.is_admin() OR EXISTS (
            SELECT 1 FROM public.oportunidades o
            WHERE o.id = cotacoes_fornecedores.oportunidade_id AND o.user_id = auth.uid()
        )
    );


-- 7. TABELA DE PEDIDOS E ENTREGAS
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    oportunidade_id UUID REFERENCES public.oportunidades(id) ON DELETE SET NULL,
    cliente_nome TEXT NOT NULL,
    fornecedor_nome TEXT NOT NULL,
    codigo_pedido TEXT,
    valor_venda NUMERIC(12, 2) NOT NULL DEFAULT 0,
    valor_custo NUMERIC(12, 2) DEFAULT 0,
    margem_lucro NUMERIC(12, 2) DEFAULT 0,
    codigo_rastreio TEXT,
    transportadora TEXT,
    previsao_entrega DATE,
    data_entrega DATE,
    chave_nfe TEXT,
    comprovante_entrega_url TEXT,
    status TEXT NOT NULL DEFAULT 'Pedido recebido' CHECK (status IN ('Pedido recebido', 'Compra fornecedor', 'NF-e confirmada', 'Em transporte', 'Entregue', 'Cancelado')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pedidos: Leitura" ON public.pedidos
    FOR SELECT USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "Pedidos: Inserção" ON public.pedidos
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR public.is_admin()));

CREATE POLICY "Pedidos: Atualização" ON public.pedidos
    FOR UPDATE USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "Pedidos: Exclusão" ON public.pedidos
    FOR DELETE USING (public.is_admin() OR user_id = auth.uid());


-- 8. TABELA DE DOCUMENTOS E ANEXOS
CREATE TABLE IF NOT EXISTS public.documentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    oportunidade_id UUID REFERENCES public.oportunidades(id) ON DELETE CASCADE,
    nome_arquivo TEXT NOT NULL,
    tipo_mime TEXT,
    tamanho_bytes BIGINT,
    storage_path TEXT,
    dados_extraidos_ia JSONB,
    status TEXT DEFAULT 'Catalogado',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Documentos: Acesso" ON public.documentos
    FOR ALL USING (public.is_admin() OR user_id = auth.uid());


-- 9. TABELA FINANCEIRA (RECEITAS, CUSTOS, COMISSÕES)
CREATE TABLE IF NOT EXISTS public.financeiro_lancamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('Receita', 'Custo Fornecedor', 'Comissao', 'Imposto', 'Outro')),
    descricao TEXT NOT NULL,
    valor NUMERIC(12, 2) NOT NULL,
    vencimento DATE NOT NULL,
    data_pagamento DATE,
    status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Pago', 'Atrasado', 'Cancelado')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.financeiro_lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Financeiro: Acesso" ON public.financeiro_lancamentos
    FOR ALL USING (public.is_admin() OR user_id = auth.uid());


-- 10. TABELA DE AUDITORIA
CREATE TABLE IF NOT EXISTS public.auditoria_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    acao TEXT NOT NULL,
    tabela TEXT NOT NULL,
    registro_id UUID,
    detalhes JSONB,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.auditoria_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auditoria: Visível apenas por administradores globais" ON public.auditoria_logs
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Auditoria: Inserção por qualquer usuário autenticado" ON public.auditoria_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
