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

        const pdfBytes = await ReceiptService.generateReceiptForDownload(id, db) as any;
        const filename = `comprovante-${id}.pdf`;
        const encodedFilename = encodeURIComponent(filename);

        return new Response(pdfBytes, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
                'Content-Length': pdfBytes.length.toString(),
            }
        });

    } catch (error) {
        console.error('Erro ao gerar comprovante:', error);
        return Response.json({ error: 'Erro ao gerar comprovante' }, { status: 500 });
    }
}
