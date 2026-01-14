import { getDb } from '@/functions/utils/db';
import { ReceiptService } from '@/lib/receipt-service';
import { getSessionUser } from '@/functions/utils/auth';

export const onRequestPost: PagesFunction = async (context) => {
    try {
        const { request, env, params } = context;
        const session = await getSessionUser(request, env);
        if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 });

        const id = params.id as string;
        const db = getDb(env);
        
        const body: any = await request.json();
        const { method } = body;

        if (!['EMAIL', 'WHATSAPP', 'BOTH'].includes(method)) {
             return Response.json({ error: 'Método inválido' }, { status: 400 });
        }

        const success = await ReceiptService.resendReceipt(id, method, db);

        return Response.json({
            message: success ? 'Comprovante reenviado com sucesso' : 'Falha ao reenviar comprovante',
            results: [{ method, success }]
        });

    } catch (error: any) {
        console.error('Erro ao reenviar comprovante:', error);
        return Response.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
    }
}
