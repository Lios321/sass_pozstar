This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Mensagens (Toast)

O projeto inclui o `Toaster` do Sonner em `components/providers.tsx`. Para facilitar o uso, utilize o util `lib/toast.ts` com funções simples para exibir mensagens:

```ts
import { Toast } from '@/lib/toast'

// Sucesso
Toast.success('Cliente criado com sucesso')

// Erro
Toast.error('Falha ao salvar alterações')

// Info/Aviso
Toast.info('Sincronizando dados...')
Toast.warning('Verifique os campos obrigatórios')

// Promessas (loading/success/error)
Toast.promise(
  fetch('/api/clients', { method: 'POST', body: JSON.stringify(data) }),
  {
    loading: 'Salvando...',
    success: 'Salvo com sucesso!',
    error: 'Não foi possível salvar',
  }
)

// Erros genéricos de API
try {
  // ...
} catch (err) {
  Toast.apiError(err)
}
```

Observação: Use esse util em componentes cliente (`'use client'`). O `Toaster` já está configurado no Provider global com cores ricas e botão de fechar.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
