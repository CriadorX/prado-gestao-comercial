# Prado Comércio & Soluções — código atual

Este pacote contém o protótipo estático publicado no ChatGPT Sites. Não é o sistema completo de produção.

## Executar

Abra `dist/index.html` em um navegador ou execute `python3 -m http.server 8080 --directory dist` e acesse http://localhost:8080.

Não requer instalação de dependências. Os arquivos são HTML, CSS e JavaScript puro.

## Implementado

- Navegação entre painéis e cadastros locais de clientes, fornecedores e oportunidades.
- Catálogo de nomes de anexos (não guarda os bytes dos arquivos).
- Foto de perfil armazenada localmente, configuração visual e formulário de senha desativado.
- Logo circular dourado, marca d'água, transições e indicador de carregamento.
- Layout responsivo e tamanho mínimo de texto de 12 px.

## Pendências e limitações

- Há telas demonstrativas, dados fixos e botões ainda sem ação. Revisar todos os fluxos; não assumir que estão funcionais.
- Cadastros usam localStorage. Não há banco compartilhado, login real ou autenticação implementada.
- Leitura de documentos por IA, consultas cadastrais, comparação, geração real de proposta PDF, edição completa, financeiro, NF-e e transportadoras ainda precisam ser implementados.
- Análise de risco não efetua consulta externa. Não atesta confiabilidade.
- Campos CPF/CNPJ de perfil e validação prometidos ainda não foram adicionados.
- Corrigir interpolação de dados em HTML antes de uso de produção (risco de XSS).
- Upload privado, auditoria, autorização por usuário e recuperação de senha precisam ser implementados no backend.

## Requisitos definidos para continuação no Codex

Preservar identidade e estrutura visual. Michel é administrador global: vê todas as operações, define permissões e cadastra usuários. Anderson e usuários comuns veem somente registros próprios; não veem os registros de Michel. Aplicar autorização no servidor e RLS no banco, não somente ocultar menus.

Administradores iniciais / perfis: Michel do Prado (licitadigitaltech@gmail.com) é global; Anderson Marcellino (marcellinob2b@gmail.com) é limitado. Não criar usuários com senha previsível ou senha presente no histórico. Definir senha em fluxo seguro. Senha mínima de 12 caracteres, maiúscula, minúscula e caractere especial. Permitir foto e atualização de perfil.

Fluxos: cliente → solicitação → propostas de fornecedores → comparação → proposta Prado → aprovação → pedido → compra → NF-e → rastreio → comprovante de entrega → financeiro. Também suportar pedido recebido → fornecedor → entrega direta. Não divulgar cliente final em cotação de fornecedor por padrão.

Testar desktop, tablet e celular. No financeiro, custos, vendas, margem, contas a pagar/receber, comissões, impostos e fluxo de caixa. Consultas externas devem identificar fontes, data e falhas; validar dígitos não confirma situação cadastral.

## Recursos externos já iniciados

- Vercel: equipe InstitutoPraMar, slug institutopramar; projeto pradocomerciosolucoes, ID prj_uY4dGUaVvz8lHYFF0Qi4ILg5Ffxt. Nenhum deploy do sistema completo foi confirmado. Proteção da Vercel ativa.
- O usuário salvou OPENAI_API_KEY como Secret em Production na Vercel. Não está neste pacote. Não baixar nem expor a chave; chamá-la somente no servidor.
- Supabase: usuário mostrou projeto GestãoComercioeSolucoes, Healthy, região East US. O acesso técnico não foi confirmado nesta sessão. Confirmar o projeto correto antes de alterar banco.
- URL pretendida: https://pradocomerciosolucoes.vercel.app (não foi confirmada como publicada).

## Segurança

Não colocar segredos no frontend nem usar service_role no navegador. Manter uploads privados, RLS e auditoria. Não enviar mensagens ou convites sem autorização específica. Remover os dados demonstrativos somente mediante decisão de implantação e preservar dados reais.

## Sugestão de pedido ao Codex

"Leia este README e o código inteiro. Continue a implementação real preservando o layout, conectando Supabase e Vercel com segredos no servidor. Implemente autenticação, permissões, auditoria, CRUDs e documentos. Teste os fluxos completos e relate limitações de integrações, sem simular consulta oficial ou emissão fiscal."
