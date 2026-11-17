# Esqueci minha senha (redefinição por CPF)

## Como funciona

1. Em `/login`, o usuário clica em **Esqueci minha senha** e vai para `/forgot-password`.
2. Ele informa o CPF. A server action `requestPasswordResetAction` (`src/actions/auth.js`)
   encontra a conta pelo CPF em `profiles` e pede ao **Supabase Auth** para enviar
   o e-mail de redefinição (`resetPasswordForEmail`). A tela mostra o e-mail mascarado
   (ex.: `ma*******@gmail.com`) para a pessoa saber qual caixa conferir.
3. O link do e-mail abre `/auth/confirm`, que valida o token e cria a sessão.
4. O usuário cai em `/reset-password`, define a nova senha e já fica logado.

Não há custo: o envio é feito pelo próprio Supabase Auth.

## Configuração no painel do Supabase (obrigatória)

### 1. URLs permitidas
**Authentication → URL Configuration**
- **Site URL**: a URL do site em produção (ex.: `https://seu-dominio.com`).
- **Redirect URLs**: adicione `https://seu-dominio.com/**` (e `http://localhost:3000/**` para testes).

### 2. Template do e-mail "Reset Password"
**Authentication → Emails → Templates → Reset Password**. Troque o link do template por:

```html
<h2>Redefinir senha</h2>
<p>Recebemos um pedido para redefinir a senha da sua conta Javango Jango.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">Criar nova senha</a></p>
<p>Se você não pediu, ignore este e-mail.</p>
```

Esse formato faz o link funcionar mesmo se a pessoa abrir o e-mail em outro
aparelho (ex.: pediu no computador e abriu no celular).

### 3. SMTP próprio (gratuito)
O servidor de e-mail padrão do Supabase **só entrega para e-mails da equipe do
projeto** e tem limite de poucos envios por hora. Para alunos receberem o e-mail,
configure um SMTP em **Authentication → Emails → SMTP Settings**. Opções gratuitas:

| Serviço | Limite grátis | Observação |
|---|---|---|
| **Gmail** (senha de app) | ~500 e-mails/dia | Mais simples: crie uma conta Gmail da escola, ative verificação em 2 etapas e gere uma "senha de app". Host `smtp.gmail.com`, porta `465`. |
| **Brevo** | 300 e-mails/dia | Exige verificar o remetente. |
| **Resend** | 3.000 e-mails/mês | Exige um domínio próprio verificado (DNS). |

Depois de configurar o SMTP, ajuste o limite em
**Authentication → Rate Limits → Rate limit for sending emails**
(ex.: 30 por hora).

## Testando
1. Acesse `/forgot-password`, informe o CPF de uma conta de teste.
2. Abra o e-mail e clique no link; você deve cair em `/reset-password`.
3. Defina a nova senha e faça login com ela.

Se o link estiver expirado ou já tiver sido usado, o usuário volta para
`/forgot-password` com um aviso para pedir outro.
