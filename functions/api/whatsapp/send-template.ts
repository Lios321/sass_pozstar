export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body: any = await context.request.json();
    const to = String(body?.to || '');

    if (!to) {
      return Response.json({ ok: false, error: 'missing_to' }, { status: 400 });
    }

    return Response.json({ ok: false, error: 'whatsapp_disabled' }, { status: 400 });
  } catch (err: any) {
    return Response.json({ ok: false, error: err?.message || 'invalid_body' }, { status: 400 });
  }
};

