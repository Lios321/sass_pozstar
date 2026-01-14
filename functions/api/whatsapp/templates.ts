import { listTemplates } from '@/lib/whatsapp-templates';

export const onRequestGet: PagesFunction = async () => {
  const items = listTemplates();
  return Response.json({ ok: true, items });
};

