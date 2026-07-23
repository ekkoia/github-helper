
-- Backfill valor_produto NULL a partir do texto "Valor pretendido:" em observacoes
UPDATE public.leads
SET valor_produto = 10000
WHERE valor_produto IS NULL
  AND observacoes ~* 'Valor pretendido:\s*at[eé] R\$\s*10\s*mil';

UPDATE public.leads
SET valor_produto = 50000
WHERE valor_produto IS NULL
  AND observacoes ~* 'Valor pretendido:\s*de\s*R\$\s*10\s*mil\s*a\s*R\$\s*50\s*mil';

UPDATE public.leads
SET valor_produto = 100000
WHERE valor_produto IS NULL
  AND observacoes ~* 'Valor pretendido:\s*de\s*R\$\s*50\s*mil\s*a\s*R\$\s*100\s*mil';

UPDATE public.leads
SET valor_produto = 150000
WHERE valor_produto IS NULL
  AND observacoes ~* 'Valor pretendido:\s*acima de R\$\s*100\s*mil';
