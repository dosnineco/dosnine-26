ALTER TABLE public.buyer_prequalifications
  ADD COLUMN IF NOT EXISTS ai_document_review_consent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_document_review_consent_at TIMESTAMPTZ;

ALTER TABLE public.buyer_documents
  ADD COLUMN IF NOT EXISTS ai_review_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (ai_review_status IN ('not_started', 'processing', 'approved', 'needs_review', 'failed')),
  ADD COLUMN IF NOT EXISTS ai_review_result JSONB,
  ADD COLUMN IF NOT EXISTS ai_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_review_model TEXT,
  ADD COLUMN IF NOT EXISTS ai_review_error TEXT,
  ADD COLUMN IF NOT EXISTS ai_content_sha256 TEXT;

CREATE INDEX IF NOT EXISTS buyer_documents_ai_content_hash_idx
  ON public.buyer_documents (prequalification_id, ai_content_sha256)
  WHERE ai_content_sha256 IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.buyer_prequalification_ai_rules (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  required_level3_docs_by_method JSONB NOT NULL,
  level4_docs_by_method JSONB NOT NULL,
  confidence_threshold NUMERIC NOT NULL DEFAULT 0.9 CHECK (confidence_threshold >= 0.5 AND confidence_threshold <= 1)
);

ALTER TABLE public.buyer_prequalification_ai_rules ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.buyer_document_ai_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.buyer_documents(id) ON DELETE CASCADE,
  prequalification_id UUID NOT NULL REFERENCES public.buyer_prequalifications(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('processing', 'approved', 'needs_review', 'failed', 'manual_approved', 'manual_rejected')),
  model TEXT NOT NULL,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS buyer_document_ai_review_events_document_idx
  ON public.buyer_document_ai_review_events (document_id, created_at DESC);

ALTER TABLE public.buyer_document_ai_review_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.buyer_prequalification_ai_level_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prequalification_id UUID NOT NULL REFERENCES public.buyer_prequalifications(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  from_level INTEGER NOT NULL,
  to_level INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'document_ai',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS buyer_prequalification_ai_level_events_assessment_idx
  ON public.buyer_prequalification_ai_level_events (prequalification_id, created_at DESC);

ALTER TABLE public.buyer_prequalification_ai_level_events ENABLE ROW LEVEL SECURITY;

INSERT INTO public.buyer_prequalification_ai_rules (
  id,
  required_level3_docs_by_method,
  level4_docs_by_method,
  confidence_threshold
) VALUES (
  1,
  '{
    "mortgage": ["mortgage_prequalification", "proof_of_savings"],
    "cash": ["proof_of_funds"],
    "nht": ["nht_documentation"],
    "savings_and_financing": ["proof_of_savings"],
    "still_saving": ["proof_of_savings"]
  }'::jsonb,
  '{
    "mortgage": ["mortgage_approval"],
    "cash": [],
    "nht": ["nht_documentation"],
    "savings_and_financing": ["mortgage_approval", "nht_documentation"],
    "still_saving": []
  }'::jsonb,
  0.9
)
ON CONFLICT (id) DO NOTHING;
