# SASS Pozstar - Sistema de Gestão de Ordens de Serviço

Este é um sistema completo de gestão de ordens de serviço (OS) desenvolvido com [Next.js](https://nextjs.org), focado em eficiência e usabilidade para assistências técnicas.

## 🚀 Funcionalidades Principais

*   **Gestão de Ordens de Serviço**: Criação, edição, atualização de status e acompanhamento de OS.
*   **Gestão de Clientes**: Cadastro completo, histórico de serviços e busca avançada.
*   **Gestão de Técnicos**: Controle de equipe técnica e atribuição de serviços.
*   **Dashboard Interativo**: Estatísticas em tempo real, gráficos de desempenho e métricas.
*   **Fila de Abertura**: Sistema de pré-cadastro rápido para equipamentos na recepção.
*   **Relatórios**: Geração de relatórios operacionais em PDF e Excel.
*   **Comprovantes**: Geração automática de comprovantes de entrada/saída em PDF.
*   **Notificações**: Sistema de alertas internos para atualizações importantes.
*   **Autenticação Segura**: Controle de acesso baseado em funções (Admin/User) via NextAuth.js.

## 🛠️ Tecnologias Utilizadas

### Frontend
*   **Framework**: Next.js 15 (App Router)
*   **Linguagem**: TypeScript
*   **Estilização**: Tailwind CSS v4
*   **Componentes**: Radix UI (Shadcn/UI concept), Lucide React
*   **Animações**: Framer Motion
*   **Gráficos**: Recharts
*   **Feedback Visual**: Sonner (Toast notifications)

### Backend
*   **API**: Next.js API Routes
*   **ORM**: Prisma
*   **Banco de Dados**: SQLite (Desenvolvimento/Local)
*   **Autenticação**: NextAuth.js v4 (JWT Strategy)
*   **Validação**: Zod
*   **PDF/Excel**: PDFKit, jsPDF, SheetJS (xlsx)

### Infraestrutura
*   **Containerização**: Docker & Docker Compose
*   **Servidor Web**: Nginx (Reverse Proxy)

## 📋 Pré-requisitos

*   Node.js 18+ ou superior
*   npm, yarn, pnpm ou bun
*   Docker & Docker Compose (Opcional, para rodar em container)

## ⚙️ Instalação e Configuração

1.  **Clone o repositório**
    ```bash
    git clone https://github.com/seu-usuario/sass_pozstar.git
    cd sass_pozstar-main
    ```

2.  **Instale as dependências**
    ```bash
    npm install
    # ou
    yarn install
    ```

3.  **Configuração de Variáveis de Ambiente**
    Crie um arquivo `.env` na raiz do projeto com base no `.env.example`. Exemplo básico para SQLite:

    ```env
    DATABASE_URL="file:./dev.db"
    NEXTAUTH_URL="http://localhost:3000"
    NEXTAUTH_SECRET="sua-chave-secreta-aqui"
    JWT_SECRET="sua-chave-jwt-aqui"
    ```

4.  **Configuração do Banco de Dados**
    Gere o cliente Prisma e execute as migrações (ou push para dev):

    ```bash
    npx prisma generate
    npx prisma db push
    # Opcional: Popular banco com dados iniciais
    npm run db:seed
    ```

5.  **Executar o Servidor de Desenvolvimento**
    ```bash
    npm run dev
    ```
    Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

## 🐳 Rodando com Docker

O projeto já possui configuração para Docker Compose, incluindo Nginx como proxy reverso.

1.  Certifique-se de que o `.env` está configurado corretamente.
2.  Execute o comando:
    ```bash
    docker compose up -d --build
    ```
3.  A aplicação estará disponível em `http://localhost` (porta 80 via Nginx) ou na porta configurada.

## 📦 Scripts Disponíveis

*   `npm run dev`: Inicia o servidor de desenvolvimento (com Turbopack).
*   `npm run build`: Cria a build de produção.
*   `npm start`: Inicia o servidor de produção.
*   `npm run lint`: Executa a verificação de linting (ESLint).
*   `npm test`: Executa os testes unitários (Jest).

## 📂 Estrutura do Projeto

*   `app/`: Rotas e páginas do Next.js (App Router).
    *   `api/`: Rotas da API Backend.
*   `components/`: Componentes React reutilizáveis.
    *   `ui/`: Componentes base (botões, inputs, etc.).
*   `lib/`: Utilitários, configurações de bibliotecas (Prisma, Auth, Utils).
*   `prisma/`: Esquema do banco de dados e sementes.
*   `public/`: Arquivos estáticos.
*   `server/`: Controllers e Services (arquitetura backend).
*   `nginx/`: Configurações do servidor Nginx.

## 🔒 Segurança

O projeto segue boas práticas de segurança, incluindo:
*   Autenticação via Sessão/JWT.
*   Validação de dados de entrada com Zod.
*   Proteção de rotas API e Páginas via Middleware.
*   Sanitização de dados para prevenir vazamentos.

---
Desenvolvido com ❤️ usando Next.js
