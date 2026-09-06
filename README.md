# Real Agência CRM

PROMPT — CRM COMERCIAL REAL AGÊNCIA

Crie um CRM comercial completo para uma agência de marketing chamada Real Agência. O sistema deve ser visual, simples de operar e focado no time comercial — SDR e Closer.

ESTRUTURA GERAL — 4 MÓDULOS

MÓDULO 1 — DASHBOARD

Painel principal com métricas em tempo real divididas em duas visões:

Visão Semanal:

Total de leads recebidos

Total de MQLs (leads qualificados)

Calls marcadas

No shows

Calls realizadas

Vendas fechadas

Faturamento da semana

Taxa de conversão lead → call

Taxa de conversão call → venda

Visão Mensal:

Mesmas métricas acima consolidadas no mês

Meta mensal de faturamento com barra de progresso

Meta mensal de vendas com barra de progresso

CPL médio do mês

CAC médio do mês

Ticket médio do mês

Gráfico de leads por dia

Gráfico de vendas por semana

MÓDULO 2 — PIPELINE

Kanban visual com colunas que o SDR move manualmente:

Coluna 1 — Novo Lead
Lead entra aqui automaticamente via integração com formulário nativo do Meta. Cada card mostra nome, telefone, segmento, tempo de mercado, se já investe em tráfego e faturamento — todos vindos do formulário.

Coluna 2 — Tentativa de Contato
SDR move quando tentou ligar e não atendeu. Inicia cadência de 14 dias automaticamente.

Coluna 3 — MQL — Lead Qualificado
SDR move quando qualificou o lead no BANT. Card mostra o resultado da qualificação.

Coluna 4 — Call Marcada
SDR move quando a reunião está agendada. Card mostra data e hora da call.

Coluna 5 — No Show
SDR move quando o lead não apareceu na call. Card volta para cadência automaticamente.

Coluna 6 — Call Realizada
SDR move quando a call aconteceu. Closer assume o card.

Coluna 7 — Proposta Enviada
Closer move após apresentar o PDF.

Coluna 8 — Venda Fechada
Closer move quando fechou. Abre campo para registrar valor da venda e plano contratado.

Coluna 9 — Perdido
Lead que não fechou. Campo obrigatório de motivo — preço, timing, concorrente, não qualificado.

MÓDULO 3 — CADÊNCIA DE FOLLOW UP

Lista separada do pipeline para leads que não atenderam. Funcionamento:

Quando SDR move lead para "Tentativa de Contato" o sistema cria automaticamente uma sequência de 14 dias com tarefas:

Dia 1 — Ligação + áudio WhatsApp

Dia 2 — Mensagem de texto

Dia 5 — Segunda ligação

Dia 7 — Mensagem de reengajamento

Dia 10 — Última tentativa de ligação

Dia 14 — Mensagem final e arquiva

Cada tarefa aparece na lista com data de execução, nome do lead e ação a realizar. SDR marca como feito manualmente e registra o que aconteceu em cada tentativa.

Se o lead responder em qualquer ponto da cadência — SDR move de volta pro pipeline na coluna correta.

MÓDULO 4 — VENDAS

Histórico completo de todas as vendas fechadas com:

Nome do cliente

Segmento

Plano contratado — Negócio R$2.300 / Escala R$3.200 / REAL R$5.000

Valor da venda

Data de fechamento

Nome do closer que fechou

Origem — tráfego pago ou orgânico

MRR gerado

Painel de MRR total da carteira com:

MRR atual

Meta de MRR

Barra de progresso

Projeção do trimestre

INTEGRAÇÕES NECESSÁRIAS

Meta Lead Ads — lead cai automaticamente na coluna "Novo Lead" com todos os dados do formulário

Notificação WhatsApp — quando lead entra o sistema notifica o SDR com nome e telefone do lead

DESIGN

Visual limpo e moderno

Cores principais: verde #C8E000 e branco

Mobile friendly — SDR precisa operar pelo celular

Cards do pipeline com foto do lead quando disponível

Indicador de tempo desde que o lead entrou — fica vermelho após 5 minutos sem contato

REGRAS DE NEGÓCIO

Lead novo fica vermelho no card após 5 minutos sem movimentação

SDR não pode mover lead para MQL sem preencher resultado do BANT

Venda fechada exige valor obrigatório antes de mover

Lead perdido exige motivo obrigatório

Cadência de 14 dias inicia automaticamente quando lead vai para "Tentativa de Contato"

Cola esse prompt direto no Lovable e passa pro seu Dev a parte de integração com Meta Lead Ads via Zapier ou Make.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://agencia-boost.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2dc2b19f-4c46-4202-bb50-9bebb8c3750f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
