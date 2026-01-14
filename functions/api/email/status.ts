import { getSessionUser } from '@/functions/utils/auth';
import { EmailService } from '@/lib/email-service';

export const onRequestGet: PagesFunction = async (context) => {
    try {
        const session = await getSessionUser(context.request, context.env);
        if (!session) {
            return Response.json({ ok: false, error: 'nao_autorizado' }, { status: 401 });
        }
        const status = EmailService.getStatus();
        return Response.json({ ok: true, status }, { status: 200 });
    } catch (error) {
        return Response.json({ ok: false, error: 'Erro interno' }, { status: 500 });
    }
}
