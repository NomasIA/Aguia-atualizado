/*
  # Sistema de Contratos de Serviços

  1. Nova Tabela: contratos_servico
    - `id` (uuid, primary key)
    - `nome_cliente` (text) - Nome do cliente/empresa contratante
    - `descricao` (text) - Descrição do serviço
    - `data_inicio` (date) - Data de início do contrato
    - `data_fim` (date) - Data prevista de término
    - `valor_total` (decimal) - Valor total do contrato
    - `custo_total` (decimal) - Custo total (diaristas + adicionais)
    - `margem_lucro` (decimal) - Margem de lucro aplicada (%)
    - `impostos` (decimal) - Impostos aplicados (%)
    - `forma_pagamento` (text) - Forma de pagamento acordada
    - `prazo_pagamento` (integer) - Prazo de pagamento em dias
    - `status` (text) - Status do contrato (ativo, concluido, cancelado)
    - `pago` (boolean) - Indica se foi totalmente pago
    - `valor_pago` (decimal) - Valor já recebido
    - `observacoes` (text) - Observações adicionais
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    - `deleted_at` (timestamptz) - Soft delete

  2. Nova Tabela: contratos_servico_diaristas
    - `id` (uuid, primary key)
    - `contrato_id` (uuid, foreign key)
    - `diarista_id` (uuid, foreign key)
    - `quantidade` (integer) - Quantidade de pessoas
    - `dias_semana` (integer) - Dias úteis trabalhados
    - `dias_fds` (integer) - Dias de FDS trabalhados
    - `valor_diaria_semana` (decimal) - Valor da diária útil
    - `valor_diaria_fds` (decimal) - Valor da diária FDS
    - `custo_total` (decimal) - Custo total deste diarista
    - `created_at` (timestamptz)

  3. Nova Tabela: contratos_servico_custos
    - `id` (uuid, primary key)
    - `contrato_id` (uuid, foreign key)
    - `descricao` (text) - Descrição do custo
    - `valor` (decimal) - Valor do custo
    - `created_at` (timestamptz)

  4. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
*/

-- Tabela de contratos de serviço
CREATE TABLE IF NOT EXISTS contratos_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_cliente text NOT NULL,
  descricao text,
  data_inicio date NOT NULL,
  data_fim date,
  valor_total decimal(15,2) NOT NULL DEFAULT 0,
  custo_total decimal(15,2) NOT NULL DEFAULT 0,
  margem_lucro decimal(5,2) NOT NULL DEFAULT 0,
  impostos decimal(5,2) NOT NULL DEFAULT 0,
  forma_pagamento text,
  prazo_pagamento integer DEFAULT 30,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'concluido', 'cancelado')),
  pago boolean NOT NULL DEFAULT false,
  valor_pago decimal(15,2) NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Tabela de diaristas por contrato
CREATE TABLE IF NOT EXISTS contratos_servico_diaristas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES contratos_servico(id) ON DELETE CASCADE,
  diarista_id uuid REFERENCES diaristas(id) ON DELETE SET NULL,
  nome_diarista text NOT NULL,
  quantidade integer NOT NULL DEFAULT 1,
  dias_semana integer NOT NULL DEFAULT 0,
  dias_fds integer NOT NULL DEFAULT 0,
  valor_diaria_semana decimal(10,2) NOT NULL DEFAULT 0,
  valor_diaria_fds decimal(10,2) NOT NULL DEFAULT 0,
  custo_total decimal(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Tabela de custos adicionais por contrato
CREATE TABLE IF NOT EXISTS contratos_servico_custos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES contratos_servico(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  valor decimal(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_contratos_servico_status ON contratos_servico(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contratos_servico_pago ON contratos_servico(pago) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contratos_servico_diaristas_contrato ON contratos_servico_diaristas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contratos_servico_diaristas_diarista ON contratos_servico_diaristas(diarista_id);
CREATE INDEX IF NOT EXISTS idx_contratos_servico_custos_contrato ON contratos_servico_custos(contrato_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_contratos_servico_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contratos_servico_updated_at
  BEFORE UPDATE ON contratos_servico
  FOR EACH ROW
  EXECUTE FUNCTION update_contratos_servico_updated_at();

-- Enable RLS
ALTER TABLE contratos_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos_servico_diaristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos_servico_custos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow anonymous read on contratos_servico"
  ON contratos_servico FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert on contratos_servico"
  ON contratos_servico FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update on contratos_servico"
  ON contratos_servico FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete on contratos_servico"
  ON contratos_servico FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous read on contratos_servico_diaristas"
  ON contratos_servico_diaristas FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert on contratos_servico_diaristas"
  ON contratos_servico_diaristas FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update on contratos_servico_diaristas"
  ON contratos_servico_diaristas FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete on contratos_servico_diaristas"
  ON contratos_servico_diaristas FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous read on contratos_servico_custos"
  ON contratos_servico_custos FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert on contratos_servico_custos"
  ON contratos_servico_custos FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update on contratos_servico_custos"
  ON contratos_servico_custos FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete on contratos_servico_custos"
  ON contratos_servico_custos FOR DELETE
  TO anon
  USING (true);