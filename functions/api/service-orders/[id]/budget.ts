import { getDb } from '@/functions/utils/db';
import { ReceiptService } from '@/lib/receipt-service';
import { getSessionUser } from '@/functions/utils/auth';

export const onRequestGet: PagesFunction = async (context) => {
    try {
        const { request, env, params } = context;
        const session = await getSessionUser(request, env);
        if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 });

        const id = params.id as string;
        const db = getDb(env);

        const result = await ReceiptService.getBudgetForDownload(id, db);
        const { buffer, filename } = result as any;

        const asciiFallback = filename
          .replace(/nº/gi, 'nro')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^ -~]/g, '');
        const encodedFilename = encodeURIComponent(filename);

        return new Response(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`,
                'Content-Length': buffer.length.toString(),
            }
        });

    } catch (error: any) {
        console.error('Erro ao gerar orçamento:', error);
        const message = error.message || 'Erro interno do servidor';
        const status = message.includes('Itens de orçamento ausentes') ? 400 : 500;
        return Response.json({ error: message }, { status });
    }
}
