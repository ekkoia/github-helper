

# Plano: Corrigir Sistema de Convites

## Problema Identificado

O arquivo `supabase/config.toml` está incompleto. Falta a configuração das Edge Functions que existe no projeto que funciona.

**Atual (incompleto):**
```text
project_id = "omilhfohvstqsonhyuxp"
```

**Correto (como no outro projeto):**
```text
project_id = "omilhfohvstqsonhyuxp"

[functions.webhook-lead]
verify_jwt = false

[functions.invite-user]
verify_jwt = true

[functions.send-invite-email]
verify_jwt = true

[functions.delete-user]
verify_jwt = true

[functions.delete-user-by-email]
verify_jwt = true
```

---

## O Que Vou Fazer

### 1. Atualizar `supabase/config.toml`

Adicionar a configuracao de todas as Edge Functions existentes no projeto.

### 2. Simplificar `src/components/CreateUserDialog.tsx`

Remover a logica complexa de retry que foi adicionada e voltar para uma chamada simples e direta, igual ao outro projeto que funciona.

**Remover:**
- Funcao `invokeWithRetry` com logica de retry
- Imports de `FunctionsHttpError`, `FunctionsRelayError`, `FunctionsFetchError`
- Estado `loadingMessage`
- Funcao `delay`

**Manter:**
- Chamada direta `supabase.functions.invoke('invite-user', { body })`
- Tratamento de erro simples
- Log de atividade

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/config.toml` | Adicionar configuracao de todas as Edge Functions |
| `src/components/CreateUserDialog.tsx` | Simplificar - remover retry e usar chamada direta |

---

## Codigo Simplificado do handleSubmit

```text
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!formData.email || !formData.nome_completo) {
    toast.error("Preencha todos os campos obrigatorios");
    return;
  }

  setIsLoading(true);

  try {
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: {
        email: formData.email,
        nome_completo: formData.nome_completo,
        telefone: formData.telefone || undefined,
        role: formData.role,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    await logActivity(
      'user_created',
      `Convite enviado para: ${formData.nome_completo} (${formData.email})`,
      { new_user_email: formData.email, role: formData.role }
    );

    toast.success("Convite enviado com sucesso!");
    setOpen(false);
    setFormData({ email: "", nome_completo: "", telefone: "", role: "user" });
    onUserCreated();
  } catch (error: any) {
    console.error("Erro ao enviar convite:", error);
    
    const msg = error.message || "";
    if (msg.includes("ja esta cadastrado") || msg.includes("already been registered")) {
      toast.error("Este email ja esta cadastrado no sistema");
    } else if (msg.includes("convite pendente")) {
      toast.error("Ja existe um convite pendente para este email");
    } else {
      toast.error(msg || "Erro ao enviar convite");
    }
  } finally {
    setIsLoading(false);
  }
};
```

---

## Resultado Esperado

Apos essas alteracoes, o sistema de convites ficara identico ao do outro projeto que funciona corretamente.

