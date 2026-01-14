import { getSessionUser } from '@/functions/utils/auth';

export const onRequestGet: PagesFunction = async (context) => {
    try {
        const session = await getSessionUser(context.request, context.env);
        return Response.json({
            authenticated: !!session,
            user: session?.user || null,
        });
    } catch {
        return Response.json({ authenticated: false }, { status: 500 });
    }
}
